#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json, ast, codecs
import sys

# Just FYI!
# b (banned) = [smlvh] (standard, modern, legacy, vintage, highlander)
# c (color) = White = A, Blue = B, Black = C, Red = D, Green = E, Gold = F, Artifact = G , Split = S, Unknown = X, Land = Z
# l (reserved list) = Y/N
# m (CMC) = N  (Split = 98, Land = 99)
# n (actual name) = 'true name nemesis' to 'True Name Nemesis'
# r (restricted) = [v] (vintage)
# t (tally) = number of times printed
# y (types) = a(rtifact or enchantment) / c(reature) / s(orcery or instant) / p(laneswalker) / z (land)

FORMATS = ('standard', 'pioneer', 'modern', 'legacy', 'vintage')
HIGHLANDER_LEGAL = ["Lurrus of the Dream-Den"]


def getLegalities(c):
    # Let's figure out legalities
    banned = 'spmlv'

    for fmt, legality in (c.get('legalities', {})).items():
        if fmt in FORMATS and legality != 'Banned':
            banned = banned.replace(fmt[0], '')

        # Check highlander bannings separately
        if fmt == "vintage" and legality == 'Banned' and c.get('name') not in HIGHLANDER_LEGAL:
            banned = banned + 'h'

    cp = c.get('printings', [])
    # if 'M21' in cp:
    #    print(c.get('name'))
    #    banned = ''

    return banned


# Yes it's stupid checking restrictions in non-Vintage formats
# But you never know :P
def getRestrictions(c):
    restricted = ''

    for fmt, legality in (c.get('legalities', {})).items():
        if fmt in FORMATS and legality == 'Restricted':
            restricted += fmt[0]

    return restricted


# Open the JSON file
jsonfh = open("AtomicCards.json", "r")

# Load all the cards into a giant dictionary
cards = json.load(jsonfh)
cards = cards.get('data', {})
print "{} cards parsed".format(len(cards))
if len(cards) == 0:
    print "No cards parsed, giving up."
    sys.exit(0)

# Open and read the Highlander points file
hlcards = {}
with codecs.open("highlander.txt", "r", "utf-8") as hlfh:
    for line in hlfh:
        (card, points) = line.strip().rsplit(" ", 1)
        hlcards[card] = int(points)

# Gotta store these cards in a dictionary
ocards = {}
ptcards = {}

# Okay, we need the colors but in a much shorter format
for card in cards.keys():
    c = cards[card][0]

    # We're going to store them in lowercase
    ocard = card.replace(u"Æ", "Ae").replace(u"à", "a").replace(" (a)", "").replace(" (b)", "").encode('utf-8').lower()

    # Skip tokens
    if c['layout'] == 'token':
        continue

    # Create an entry in the output dictionary
    ocards[ocard] = {}
    ptcards[ocard] = {}

    ptcards[ocard]['name'] = c.get('name', '').replace(" (a)", "").replace(" (b)", "")
    ptcards[ocard]['manaCost'] = c.get('manaCost', '')
    ptcards[ocard]['text'] = c.get('text', '').replace(u"−", "-")
    ptcards[ocard]['type'] = c.get('type', '')
    ptcards[ocard]['power'] = c.get('power', '-999')
    ptcards[ocard]['toughness'] = c.get('toughness', '-999')
    ptcards[ocard]['loyalty'] = str(c.get('loyalty', '-999'))
    
    # Types for sorting
    if 'Land' in c['types']:
        ocards[ocard]['y'] = 'z'
    elif 'Creature' in c['types']:
        ocards[ocard]['y'] = 'c'
    elif 'Artifact' in c['types'] or 'Enchant' in c['types']:
        ocards[ocard]['y'] = 'a'
    elif 'Instant' in c['types'] or 'Sorcery' in c['types']:
        ocards[ocard]['y'] = 's'
    elif 'Planeswalker' in c['types']:
        ocards[ocard]['y'] = 'p'

    # Make the colors shorter
    if 'colors' not in c:
        pass
    elif len(c['colors']) > 1:
        ocards[ocard]['c'] = 'F'    # gold
    elif c['colors'] == ['W']:
        ocards[ocard]['c'] = 'A'
    elif c['colors'] == ['U']:
        ocards[ocard]['c'] = 'B'
    elif c['colors'] == ['B']:
        ocards[ocard]['c'] = 'C'
    elif c['colors'] == ['R']:
        ocards[ocard]['c'] = 'D'
    elif c['colors'] == ['G']:
        ocards[ocard]['c'] = 'E'

    # Lands and (noncolored) artifacts are special
    if 'Land' in c['types']:
        ocards[ocard]['c'] = 'Z'  # Sort lands last
    elif ('Artifact' in c['types']) and ('colors' not in c):
        ocards[ocard]['c'] = 'G'

    # Now try to deal with CMC
    if 'convertedManaCost' not in c:
        ocards[ocard]['m'] = 99
    else:
        ocards[ocard]['m'] = c['convertedManaCost']

    # Add it into the file if the banned list isn't empty
    legality = getLegalities(c)
    ocards[ocard]['b'] = legality
    restrictions = getRestrictions(c)
    ocards[ocard]['r'] = restrictions

    # And put the true name in there as well
    ocards[ocard]['n'] = card.replace(u"Æ", "Ae").replace(u"à", "a").replace(" (a)", "").replace(" (b)", "").encode('utf-8')

    # Check highlander points
    ocards[ocard]['p'] = hlcards.get(card, 0)

    # RL
    ocards[ocard]['l'] = str(c.get('isReserved', 'F')).replace("True", "T")

    # Set tally
    printings = ast.literal_eval(str(c.get("printings", [])))
    ocards[ocard]['t'] = len(printings)

    # Now to handle split cards (ugh)
    if len(cards[card]) > 1:
        # if c['layout'] == "split":
        name = card
        ocard = name.lower().replace(u'\xc6', u'\xe6')   # Just like a real card

        ocards[ocard] = {}
        ocards[ocard]['c'] = 'S'
        ocards[ocard]['m'] = 98
        ocards[ocard]['n'] = name
        ocards[ocard]['t'] = 0
        ocards[ocard]['p'] = 0
        ocards[ocard]['l'] = 'F'

        legality = getLegalities(c)
        ocards[ocard]['b'] = legality

        restrictions = getRestrictions(c)
        ocards[ocard]['r'] = restrictions


# Print out the full list of cards
with open("decklist-cards.js", "w") as ojsonfh:
    ojsonfh.write('cards=')
    json.dump(ocards, ojsonfh)

with open('playtest-cards.js', 'w') as f:
    f.write('cards=')
    json.dump(ptcards, f)
