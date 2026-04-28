#!/bin/sh

# Clean up a bit
rm -f *.js *.zip

curl "https://mtgjson.com/api/v5/AllIdentifiers.json.zip" > AllIdentifiers.json.zip

# Parse out the giant JSON and make a much smaller one
python3 parsecards.py

# Minify
terser decklist-cards.js -o decklist-cards-min.js
terser playtest-cards.js -o playtest-cards-min.js

# Clean up a bit
rm AllIdentifiers*
rm decklist-cards.js
rm playtest-cards.js
