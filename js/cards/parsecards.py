#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import sys

# Just FYI!
# b (banned) = [smlv] (standard, modern, legacy, vintage)
# c (color) = White = A, Blue = B, Black = C, Red = D, Green = E, Gold = F, Artifact = G , Split = S, Unknown = X, Land = Z
# m (CMC) = N  (Split = 98, Land = 99)
# n (actual name) = 'true name nemesis' to 'True Name Nemesis'
# r (restricted) = [v] (vintage)

FORMATS = ('Standard', 'Modern', 'Legacy', 'Vintage')

def getLegalities(card, cards):
    # Let's figure out legalities
    banned = 'smlv'

    for legality in cards[card].get('legalities', []):
        if legality.get('format') in FORMATS and legality.get('legality') != 'Banned':
            banned = banned.replace(legality.get('format')[0].lower(), '')

    return banned

# Yes it's stupid checking restrictions in non-Vintage formats
# But you never know :P
def getRestrictions(card, cards):
    restricted = ''

    for legality in cards[card].get('legalities', []):
        if legality.get('format') in FORMATS and legality.get('legality') == 'Restricted':
            restricted += legality.get('format')[0].lower()

    return restricted

# Open the JSON file
jsonfh = open("AllCards-x.json", "r")

# Load all the cards into a giant dictionary
cards = json.load(jsonfh)

# Open and read the Highlander points file
hlcards = {}
with open("highlander.txt", "r") as hlfh:
    for line in hlfh:
        (card, points) = line.strip().rsplit(" ", 1)
        hlcards[card] = int(points)

# Gotta store these cards in a dictionary
ocards = {}
ptcards = {}

# Okay, we need the colors but in a much shorter format
for card in cards:

    # We're going to store them in lowercase
    ocard = card.replace(u"Æ", "Ae").replace(u"à", "a").encode('utf-8').lower()

    # Skip tokens
    if cards[card]['layout'] == 'token': continue

    # Create an entry in the output dictionary
    ocards[ocard] = {}
    ptcards[ocard] = {}

    ptcards[ocard]['name'] = cards[card].get('name', '')
    ptcards[ocard]['manaCost'] = cards[card].get('manaCost', '')
    ptcards[ocard]['text'] = cards[card].get('text', '').replace(u"−", "-")
    ptcards[ocard]['type'] = cards[card].get('type', '')
    ptcards[ocard]['power'] = cards[card].get('power', '-999')
    ptcards[ocard]['toughness'] = cards[card].get('toughness', '-999')
    ptcards[ocard]['loyalty'] = str(cards[card].get('loyalty', '-999'))


    # Lands and (noncolored) artifacts are special
    if 'Land' in cards[card]['types']:
        ocards[ocard]['c'] = 'Z' # Sort lands last
    elif (('Artifact' in cards[card]['types']) and ('colors' not in cards[card])):
        ocards[ocard]['c'] = 'G'

    # Make the colors shorter
    if ('colors' not in cards[card]): pass
    elif len(cards[card]['colors']) > 1:      ocards[ocard]['c'] = 'F'    # gold
    elif cards[card]['colors'] == ['White']:  ocards[ocard]['c'] = 'A'
    elif cards[card]['colors'] == ['Blue']:   ocards[ocard]['c'] = 'B'
    elif cards[card]['colors'] == ['Black']:  ocards[ocard]['c'] = 'C'
    elif cards[card]['colors'] == ['Red']:    ocards[ocard]['c'] = 'D'
    elif cards[card]['colors'] == ['Green']:  ocards[ocard]['c'] = 'E'

    # Now try to deal with CMC
    if 'cmc' not in cards[card]: ocards[ocard]['m'] = 99
    else: ocards[ocard]['m'] = cards[card]['cmc']

    # Add it into the file if the banned list isn't empty
    legality = getLegalities(card, cards)
    ocards[ocard]['b'] = legality
    restrictions = getRestrictions(card, cards)
    ocards[ocard]['r'] = restrictions

    # And put the true name in there as well
    ocards[ocard]['n'] = card.replace(u"Æ", "Ae").replace(u"à", "a").encode('utf-8')

    # Check highlander points
    ocards[ocard]['p'] = hlcards.get(card, 0)

    # Now to handle split cards (ugh)
    if 'names' in cards[card]:
        name = " // ".join(cards[card]['names'])
        ocard = name.lower().replace(u'\xc6', u'\xe6')   # Just like a real card

        ocards[ocard] = {}
        ocards[ocard]['c'] = 'S'
        ocards[ocard]['m'] = 98
        ocards[ocard]['n'] = name

        legality = getLegalities(card, cards)
        if legality != "": ocards[ocard]['b'] = legality


# Print out the full list of cards
with open("decklist-cards.js", "w") as ojsonfh:
    ojsonfh.write('cards=')
    json.dump(ocards, ojsonfh)

with open('playtest-cards.js', 'w') as f:
    f.write('cards=')
    json.dump(ptcards, f)
