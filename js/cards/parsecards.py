#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import sys

# Just FYI!
# b (banned) = [sml] (standard, modern, legacy)
# c (color) = White = A, Blue = B, Black = C, Red = D, Green = E, Gold = F, Artifact = G , Split = S, Unknown = X, Land = Z
# m (CMC) = N  (Split = 98, Land = 99)
# n (actual name) = 'true name nemesis' to 'True Name Nemesis'

def getLegalities(card, cards):
	# Let's figure out legalities
	banned = ""

	if 'legalities' not in cards[card]: pass
	else:

		# If it doesn't have an entry in the JSON file, that means it's outside the format; we'll call that banned
		if 'Standard' not in cards[card]['legalities']: cards[card]['legalities']['Standard'] = "Banned"
		if 'Modern'   not in cards[card]['legalities']: cards[card]['legalities']['Modern'] =   "Banned"
		if 'Legacy'   not in cards[card]['legalities']: cards[card]['legalities']['Legacy'] =   "Banned"

		# Now to see if we should add them to our list
		if cards[card]['legalities']['Standard'] == "Banned": banned += "s"
		if cards[card]['legalities']['Modern']   == "Banned": banned += "m"
		if cards[card]['legalities']['Legacy']   == "Banned": banned += "l"
	
	return(banned)

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

# Okay, we need the colors but in a much shorter format
for card in cards:

	# We're going to store them in lowercase
	ocard = card.replace(u"Æ", "Ae").replace(u"à", "a").encode('utf-8').lower()

	# Skip tokens
	if cards[card]['layout'] == 'token': continue

	# Create an entry in the output dictionary
	ocards[ocard] = {}

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
	if legality != "": ocards[ocard]['b'] = legality

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
ojsonfh = open("decklist-cards.js", "w")
ojsonfh.write('cards=')
json.dump(ocards, ojsonfh)
ojsonfh.close()
