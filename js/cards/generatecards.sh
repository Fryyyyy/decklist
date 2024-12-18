#!/bin/sh

# Clean up a bit
rm -f *.js *.zip

curl "https://mtgjson.com/api/v5/AtomicCards.json.zip" > AtomicCards.json.zip
unzip AtomicCards.json.zip

# Parse out the giant JSON and make a much smaller one
python3 parsecards.py

# Minify
terser decklist-cards.js -o decklist-cards-min.js
terser playtest-cards.js -o playtest-cards-min.js

# Clean up a bit
rm AtomicCards*
rm decklist-cards.js
rm playtest-cards.js
