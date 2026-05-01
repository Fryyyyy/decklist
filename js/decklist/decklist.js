// Try to gracefully parse as many decks as possible
// Parsing data is like the worst
function parseDecklist() {
    let deckmain = $('#deckmain').val() || '';
    let deckside = $('#deckside').val() || '';
    let deckmain2_val = $('#deckmain2').val() || '';
    let deckmain3_val = $('#deckmain3').val() || '';

    // Let's store the lists in a tidy little array
    maindeck = [];
    maindecks = [maindeck];
    let maindeck2;
    let maindeck3;
    if (deckmain2_val) {
        maindeck2 = [];
        maindecks.push(maindeck2);
    }
    if (deckmain3_val) {
        maindeck3 = [];
        maindecks.push(maindeck3);
    }
    sideboard = [];

    // And let's store their counts for future reference
    maindeck_count = 0;
    sideboard_count = 0;
    sideboard_counts = [];

    // Track unrecognized cards and lines that can't be parsed.
    // (encoded to prevent XSS)
    unrecognized = {};
    unparseable = [];
    goodcards = [];
    if (!deckmain && !deckmain2_val && !deckmain3_val) { return (null, null); }

    const deckmainLines = deckmain.split('\n');
    const decksideLines = deckside.split('\n');

    const mtgoRE     = /^(\d+)x*\s(.+)/; // MTGO deck format (4 Brainstorm) also TCG (4x Brainstorm)
    const mtgosbRE   = /^SB:\s+(\d+)*\s*(.+)/; // Sideboard lines begin with SB:
    const mwsRE      = /^\s*(\d+)\s+\[.*\]\s+(.+)/; // MWS, what an ugly format
    const mwssbRE    = /^SB:\s*(\d+)\s+\[.*\]\s(.+)/; // MWS, what an ugly format
    const tosbRE     = /^Sideboard|SIDEBOARD:/; // Tappedout looks like MTGO, except sideboard begins with Sideboard:  Salvation, same, but no colon
    const moxfieldRE = /^(\d+) (.*)? \(\w+\) (\S+-?)+( \*?(?:F|E)\*?)?$/; // Moxfield: 1 Collector Ouphe (PLST) MH1-158 *F*

    function parseDeckLines(lines, deck, deckIndex) {
        let in_sb = false;
        let local_sideboard_count = 0;
        for (let i = 0; i < lines.length; i++) {
            let line = (lines[i] || '').trim();
            line = line.replace(/"/g, '');
            line = line.replace(/\*+/g, '');
            if (line === '') { continue; }

            let quantity;
            let card;

            if (mwsRE.exec(line) != null) {
                quantity = mwsRE.exec(line)[1];
                card = mwsRE.exec(line)[2];
                card = recognizeCard(card, quantity, 'main', deck, local_sideboard_count);
            }
            else if (mwssbRE.exec(line) != null) {
                quantity = mwssbRE.exec(line)[1];
                card = mwssbRE.exec(line)[2];
                card = recognizeCard(card, quantity, 'side', null, local_sideboard_count);
            }
            else if (moxfieldRE.exec(line) != null) {
                quantity = moxfieldRE.exec(line)[1];
                card = moxfieldRE.exec(line)[2];
                if (in_sb) {
                    card = recognizeCard(card, quantity, 'side', null, local_sideboard_count);
                } else {
                    card = recognizeCard(card, quantity, 'main', deck, local_sideboard_count);
                }
            }
            else if (mtgoRE.exec(line) != null) {
                quantity = mtgoRE.exec(line)[1];
                card = mtgoRE.exec(line)[2];
                if (in_sb) {
                    card = recognizeCard(card, quantity, 'side', null, local_sideboard_count);
                } else {
                    card = recognizeCard(card, quantity, 'main', deck, local_sideboard_count);
                }
            }
            else if (mtgosbRE.exec(line) != null) {
                quantity = mtgosbRE.exec(line)[1];
                card = mtgosbRE.exec(line)[2];
                if (quantity == undefined) { quantity = '1'; }
                card = recognizeCard(card, quantity, 'side', null, local_sideboard_count);
            }
            else if (tosbRE.test(line)) {
                in_sb = true;
            }
            else {
                card = line;
                quantity = '1';
                card = recognizeCard(card, quantity, 'main', deck, local_sideboard_count);
            }
        }
        sideboard_counts[deckIndex] = local_sideboard_count;
    }

    const deckSources = [
        { lines: deckmainLines, deck: maindeck }
    ];
    if (deckmain2_val) {
        deckSources.push({ lines: deckmain2_val.split('\n'), deck: maindeck2 });
    }
    if (deckmain3_val) {
        deckSources.push({ lines: deckmain3_val.split('\n'), deck: maindeck3 });
    }
    deckSources.forEach(function(source, index) {
        parseDeckLines(source.lines, source.deck, index);
    });

    // Now we get to do the same for the sideboard, but we only have to worry about TCG/MTGO and Moxfield style entries
    for (let i = 0; i < decksideLines.length; i++) {
        let line = (decksideLines[i] || '').replace(/"/g, '');
        if (moxfieldRE.exec(line) != null) {
          quantity = moxfieldRE.exec(line)[1];
          card = moxfieldRE.exec(line)[2];
          card = recognizeCard(card, quantity, 'side');
        } else if (mtgoRE.exec(line) != null) {
            quantity = mtgoRE.exec(line)[1];
            card = mtgoRE.exec(line)[2];
            card = recognizeCard(card, quantity, 'side');
        } else {
            // Could not be parsed, store in appropriate array
            //addUnparseable(line);
            if(line != '') {
                card = line;
                quantity = '1';
                card = recognizeCard(card, quantity, 'side');
            }
        }
    }

    // Now we need to sort the deck lists, with the sideboard always being sorted alphabetically
    let sortorder;
    if ( $('#sortorderfloat input[name=sortorder]:checked').prop('id') == 'sortorder1' ) { // alpabetical
        sortorder = 'alphabetically';
    }
    else if ( $('#sortorderfloat input[name=sortorder]:checked').prop('id') == 'sortorder2' ) { // CMC
        sortorder = 'cmc';
    }
    else if ( $('#sortorderfloat input[name=sortorder]:checked').prop('id') == 'sortorder3' ) { // color
        sortorder = 'color';
    }
    else if ( $('#sortorderfloat input[name=sortorder]:checked').prop('id') == 'sortorder4' ) { // numeric
        sortorder = 'numerically';
    }
    else if ( $('#sortorderfloat input[name=sortorder]:checked').prop('id') == 'sortorder6' ) { // type
        sortorder = 'type';
    }
    for (let i = 0; i < maindecks.length; i++) {
        maindecks[i] = sortDecklist(maindecks[i], sortorder);
    }
    sideboard = sortDecklist(sideboard, 'alphabetically');

    // Check the card name against the card database. If it exists, add it to the
    // appropriate list (main or side), otherwise add it to the unrecognized map.
    function recognizeCard(card, quantity, list, deck, local_sideboard_count) {
        list = list || 'main';
        deck = deck || maindeck;
        card = (card || '').trim();

        //if (card.slice(0,2).toLowerCase() === 'ae') { recognized = objectHasPropertyCI(cards, '\u00e6'+card.slice(2)); }
        //else { recognized = objectHasPropertyCI(cards, card); }
        card = card.replace("’", "'").replace(" / ", " // ");
        const recognized = objectHasPropertyCI(cards, card);

        // Always add the card to the list, regardless of if the card is recognized
        // Still, if not recognized, add it to its special dictionary (unrecognized)

        if (recognized) {
            if (recognized.f) {
              return recognizeCard(recognized.f, quantity, list, deck, local_sideboard_count);
            }
            list_add(list, list === 'main' ? deck : sideboard, recognized.n, quantity);
            if (list === 'side') {
                local_sideboard_count += parseInt(quantity);
            }
            goodcards.push(recognized);
        } else {
            list_add(list, list === 'main' ? deck : sideboard, "?? "+card, quantity);
            if (list === 'side') {
                local_sideboard_count += parseInt(quantity);
            }
            unrecognized[htmlEncode(card)] = 1;
        }
        return card;
    }

    // add the passed string to the unparseable array if it isn't empty or entirely whitespace
    function addUnparseable(line) {
        // only store if it's not a falsey value (empty string, etc.)
        // or entirely composed of whitespace
        if (htmlEncode(line) && !htmlEncode(line).match(/^\s+$/)) {
            unparseable.push(htmlEncode(line));
        }
    }

    // Case-insensitive property search, modified from:
    // http://stackoverflow.com/a/12484507/540162
    // Returns property value (properly-capitalized card name) if found, false otherwise
    function objectHasPropertyCI(obj, val) {
        for (var p in obj) {
            if (obj.hasOwnProperty(p) && p.toLowerCase() === val.toLowerCase()) {
                return obj[p];
            }
        }
        // If we got to the end and didn't find a card, check:
        // Is it exactly the first half of a DFC?
        // Don't want this in the main loop just in case.
        for (var p in obj) {
            if (p.includes(" // ")) {
              if (val.toLowerCase() === p.split(" // ")[0].toLowerCase()) {
                return obj[p];
              }
            }
        }
        return false;
    }
}

function sortDecklist(deck, sortorder) {

  // Sort the decklist alphabetically, if chosen
  if ( sortorder == 'alphabetically' ) {

    // Add a case insensitive field to sort by
    for (i = 0; i < deck.length; i++) { deck[i] = [ deck[i][0].toLowerCase(), deck[i][0], deck[i][1] ]; }

    deck.sort();

    // After sorting is done, we can remove the lower case index
    for (i = 0; i < deck.length; i++) { deck[i] = deck[i].splice(1, 2); }
  }

  // Sort the decklist by color, if chosen
  // White = A, Blue = B, Black = C, Red = D, Green = E, Gold = F, Artifact = G , Unknown = X, Land = Z
  else if ( sortorder == 'color' ) {
    var color_to_cards = {};

    for (i = 0; i < deck.length; i++) {

      // We're going to search by lower case
      var lcard = deck[i][0].toLowerCase();

      // Grab the card's color
      if (lcard in cards) { color = cards[ lcard ]['c']; }
      else { color = 'X'; } // Unknown

      // Create the color subarray
      if ( !(color in color_to_cards ) ) { color_to_cards[color] = []; }

      // Fix the Aetherling issue until the PDF things supports it
      lcard = lcard.replace('\u00c6', 'Ae').replace('\u00e6', 'ae');
      deck[i][0] = deck[i][0].replace('\u00c6', 'Ae').replace('\u00e6', 'ae');

      // Add the card to that array, including lower-case (only used for sorting)
      color_to_cards[color].push( [ lcard, deck[i][0], deck[i][1] ] );

    }

    // Get the list of colors in the deck
    color_to_cards_keys = Object.keys(color_to_cards).sort();

    // Sort each subcolor, then append them to the final array
    deck = []
    for (i = 0; i < color_to_cards_keys.length; i++) {
      // Push a blank entry onto deck (to separate colors)
      // unless the deck is empty
      if (deck.length !== 0) {
        deck.push(['', 0]);
      }

      color = color_to_cards_keys[i];

      color_to_cards[ color ].sort();   // color_to_cards['A']

      for (j = 0; j < color_to_cards[color].length; j++) {
        card = color_to_cards[color][j][1];
        quantity = color_to_cards[color][j][2];

        deck.push([card, quantity]);
      }
    }

    // We must clear out the 32nd entry, if it's blank, as it's at the top of the 2nd column
    if (deck.length > 31) {
      if (deck[31][1] == 0) {
        deck.splice(31, 1);
      }
    }
  }

  // Sort the decklist by CMC, if chosen
  else if ( sortorder == 'cmc' ) {
    var cmc_to_cards = {}

    for (i = 0; i < deck.length; i++) {

      // We're going to search by lower case
      var lcard = deck[i][0].toLowerCase();

      // Grab the card's cmc
      if (lcard in cards) { cmc = cards[ lcard ]['m']; }
      else { cmc = 100; } // Unknown

      // Break out no-mana-cost cards that aren't lands
      if(cmc == 99 && cards[lcard]['c'] != 'Z') {
        cmc = -1;
      }

      // Convert the CMC to a string, and pad zeroes (grr Javascript)
      cmc = cmc.toString();
      if ( cmc.length == 1 ) { cmc = '00' + cmc; }
      if ( cmc.length == 2 ) { cmc = '0' + cmc; }

      // Create the cmc subarray
      if ( !(cmc in cmc_to_cards ) ) { cmc_to_cards[cmc] = []; }

      // Fix the Aetherling issue until the PDF things supports it
      lcard = lcard.replace('\u00c6', 'Ae').replace('\u00e6', 'ae');
      deck[i][0] = deck[i][0].replace('\u00c6', 'Ae').replace('\u00e6', 'ae');

      // Add the card to that array, including lower-case (only used for sorting)
      cmc_to_cards[cmc].push( [ lcard, deck[i][0], deck[i][1] ] );

    }

    // Get the list of CMCs in the deck
    cmc_to_cards_keys = Object.keys(cmc_to_cards).sort();

    // Sort each CMC, then append them to the final array
    deck = []
    for (i = 0; i < cmc_to_cards_keys.length; i++) {
      // Push a blank entry onto deck (to separate CMCs)
      // unless the deck is empty
      if (deck.length !== 0) {
        deck.push(['', 0]);
      }

      cmc = cmc_to_cards_keys[i];

      cmc_to_cards[ cmc ].sort();

      for (j = 0; j < cmc_to_cards[cmc].length; j++) {
        card = cmc_to_cards[cmc][j][1];
        quantity = cmc_to_cards[cmc][j][2];

        deck.push([card, quantity]);
      }
    }

    // We must clear out the 32nd entry, if it's blank, as it's at the top of the 2nd column
    if (deck.length > 31) {
      if (deck[31][1] == 0) {
        deck.splice(31, 1);
      }
    }
  }

  // Sort the decklist numerically, if chosen
  else if ( sortorder == 'numerically' ) {

    // Add a case insensitive field, swap order around
    for (i = 0; i < deck.length; i++) {
      deck[i] = [ deck[i][1], deck[i][0].toLowerCase(), deck[i][0] ]
    }

    deck.sort();

    // After sorting is done, we can remove the lower case index
    for (i = 0; i < deck.length; i++) { deck[i] = [ deck[i][2], deck[i][0] ] }
  }

  // Sort the decklist by type, if chosen
  // Basically the same as color
  else if ( sortorder == 'type' ) {
    var type_to_cards = {};

    for (i = 0; i < deck.length; i++) {

      // We're going to search by lower case
      var lcard = deck[i][0].toLowerCase();

      // Grab the card's color
      if (lcard in cards) { type = cards[ lcard ]['y']; }
      else { type = 'X'; } // Unknown

      // Create the color subarray
      if ( !(type in type_to_cards ) ) { type_to_cards[type] = []; }

      // Fix the Aetherling issue until the PDF things supports it
      lcard = lcard.replace('\u00c6', 'Ae').replace('\u00e6', 'ae');
      deck[i][0] = deck[i][0].replace('\u00c6', 'Ae').replace('\u00e6', 'ae');

      // Add the card to that array, including lower-case (only used for sorting)
      type_to_cards[type].push( [ lcard, deck[i][0], deck[i][1] ] );

    }

    // Get the list of colors in the deck
    type_to_cards_keys = Object.keys(type_to_cards).sort();

    // Sort each subcolor, then append them to the final array
    deck = []
    for (i = 0; i < type_to_cards_keys.length; i++) {
      // Push a blank entry onto deck (to separate types)
      // unless the deck is empty
      if (deck.length !== 0) {
        deck.push(['', 0]);
      }

      type = type_to_cards_keys[i];

      type_to_cards[ type ].sort();

      for (j = 0; j < type_to_cards[type].length; j++) {
        card = type_to_cards[type][j][1];
        quantity = type_to_cards[type][j][2];

        deck.push([card, quantity]);
      }
    }

    // We must clear out the 32nd entry, if it's blank, as it's at the top of the 2nd column
    if (deck.length > 31) {
      if (deck[31][1] == 0) {
        deck.splice(31, 1);
      }
    }
  }

  // Get the card's true English name (ignoring any particular capitalization that someone may have done)
  for (i = 0; i < deck.length; i++) {
    var lcard = deck[i][0].toLowerCase()
    if (cards[ lcard ] != undefined) {
      deck[i][0] = cards[ lcard ]['n']
    }
  }

  // Return the deck
  return(deck);

}

// Stub to simplify updating deck and sideboard counts
// Adds a new entry for unique entries, increments existing entries for duplicates
function list_add(type, deck, card, quantity) {
  const cardIndex = listContainsCard(deck, card);
  if (cardIndex !== -1) {
    // arggh, strings!
    deck[cardIndex][1] = parseInt(deck[cardIndex][1]) + parseInt(quantity) + '';
  } else {
    deck.push([card, quantity]);
  }
  if (type === 'main') {
    maindeck_count += parseInt(quantity);
  } else if (type === 'side') {
    sideboard_count += parseInt(quantity);
  }

  // Returns the index of the card:quantity pair within the given list, or -1 if not found
  function listContainsCard(list, card) {
    for (let j = 0; j < list.length; j++) {
      if (list[j][0] === card) {
        return j;
      }
    }
    return -1;
  }
}

function htmlEncode(string) {
  return string.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

$(document).ready(function() {
    $('#import-csv-button').on('click', function(event) {
        importCSV(event);
    });
});

function importCSV(event) {
    let file = $('#csv-file-input').prop('files')[0];
    if (!file) {
        alert("Please select a file!");
        return;
    }

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            let firstDeck = true;
            let dl;

            results.data.forEach(function(data, i) {
                if (data.DecklistName) {
                    $('#deckname').val(data.DecklistName);
                }
                if (data.FormatName) {
                    $('#eventformat').val(data.FormatName);
                }
                if (data.OwnerFirstName) {
                    $('#firstname').val(data.OwnerFirstName);
                }
                if (data.OwnerLastName) {
                    $('#lastname').val(data.OwnerLastName);
                }

                if (data.Records && data.Records !== '[]') {
                    try {
                        let records = JSON.parse(data.Records.replace(/""/g, '"'));
                        let mainDeckText = '';
                        let sideBoardText = '';
                        let mainDeckCount = 0;
                        let isHighlander = true;
                        const basicLands = ["Mountain", "Island", "Swamp", "Plains", "Forest", "Wastes"];

                        records.forEach(function(card) {
                            if (card.c === 99) { // 99 indicates sideboard
                                sideBoardText += card.q + ' ' + card.n + '\n';
                            } else {
                                mainDeckText += card.q + ' ' + card.n + '\n';
                                mainDeckCount += card.q;
                                if (card.q > 1 && !basicLands.includes(card.n)) {
                                    isHighlander = false;
                                }
                            }
                        });

                        $('#deckmain').val(mainDeckText);
                        $('#deckside').val(sideBoardText);

                        if (mainDeckCount === 60 && isHighlander) {
                            $("select[name=eventformat]").val("Highlander");
                        }

                        parseDecklist();

                        if (firstDeck) {
                            if ($("select[name=eventformat]").val().startsWith("Highlander")) {
                                dl = generateHLDecklistLayout();
                            } else {
                                dl = generateDecklistLayout();
                            }
                            firstDeck = false;
                        } else {
                            dl.addPage();
                        }

                        if ($("select[name=eventformat]").val().startsWith("Highlander")) {
                            addHLTemplateToDL(dl);
                            addHLMetadataToDL(dl);
                            addHLCardsToDL(dl);
                        } else {
                            addTemplateToDL(dl);
                            addMetaDataToDL(dl);
                            addCardsToDL(dl);
                        }
                    } catch (e) {
                        alert('Error processing row ' + (i + 2) + ': ' + e);
                    }
                }
            });

            if (dl) {
                let filename = "decklists.pdf";
                savePDF(dl, filename);
                
                addLogoToDL(dl);
                let domdl = dl.output('dataurlstring');
                $('iframe').attr('src', domdl);
            }
        }
    });
}
