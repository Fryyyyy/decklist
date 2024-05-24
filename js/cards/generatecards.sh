#!/bin/sh

# Clean up a bit
rm -f *.js *.zip

curl "https://mtgjson.com/api/v5/AtomicCards.json.zip" > AtomicCards.json.zip
unzip AtomicCards.json.zip

# Parse out the giant JSON and make a much smaller one
python3 parsecards.py

# Minify
java -jar ../../tools/yuicompressor-2.4.8.jar -o '.js$:-min.js' *.js

# Clean up a bit
#rm AllCards*
#rm decklist-cards.js
