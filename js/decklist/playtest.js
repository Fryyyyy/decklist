var decklistChangeTimer = null;
var pdfChangeTimer = null;

$(document).ready(function() {
    // bind events to all the input fields on the left side, to generate a PDF on change
    $('div.left input, div.left textarea').on('input', pdfChangeWait);
    $("#download").button();
    $("#cardtodeck").button();

    var cardNames = [];
    var numberRegExp = /^([0-9]+) (.*)$/;
    $.each(cards, function(key, value) { cardNames.push(cards[key]["name"]) })

    $("#cardentry").autocomplete({
        autoFocus: true,
        delay: 100,
        source: cardNames,
        search: function(event, ui) {
            if(numberRegExp.test(event.target.value)) {
                var matches = numberRegExp.exec(event.target.value);
                cardQuantity = matches[1];
                event.target.value = matches[2];
            }
        },
        response: function(event, ui) {
            ui.content.sort(function(a, b){
                return ((a.label < b.label) ? -1 : ((a.label > b.label) ? 1 : 0));
            });
        }
    }).data('ui-autocomplete')._renderItem = function( ul, item ) {
        var term = $('#cardentry').val();
        var label = item.label.replace(new RegExp(term, 'i'), '<span class="highlight">$&</span>');

        return $( '<li></li>' )
            .data( 'ui-autocomplete-item', item )
            .append( '<a>' + label + '</a>' )
            .appendTo( ul );
    };

    // Overrides the default autocomplete filter function to search only from the beginning of the string
    $.ui.autocomplete.filter = function (array, term) {
        var matcher = new RegExp('(^| )' + $.ui.autocomplete.escapeRegex(term), 'i');
        return $.grep(array, function (value) {
            return matcher.test(value.label || value.value || value);
        });
    };

    // Enter on the manual card entry defaults to Main deck
    // Adding to sideboard still requires a click though
    $("#cardentry").keyup(function(event) {
        if(event.keyCode == 13) {
            cardToDeck();
        }
    });

    // detect browser PDF support
    detectPDFPreviewSupport();

    // parse the GET parameters and set them, also generates preview (via event)
    parseGET();

});

(function($) {
    $._GET = (function(a) {
        if (a == '') return {};
        var b = {};
        for (var i = 0; i < a.length; ++i)
        {
            var p=a[i].split('=');
            if (p.length != 2) continue;
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })(window.location.search.substr(1).split('&'))
})(jQuery);

// Parse the GET attributes, locking out fields as needed
function parseGET() {
    if($._GET['deck'] != undefined) {
        $('#deck').val( $._GET['deck'] );
    }

    generatePlaytestPDF();
}

function cardToDeck() {
    if($("#cardentry").val() == "") {
        return;
    }
    if($("#deck").val() == "") {
        linebreak = "";
    } else {
        linebreak = "\r\n";
    }
    $("#deck").val($("#deck").val() + linebreak + cardQuantity + " " + $("#cardentry").val());
    $("#cardentry").val("");
    cardQuantity = 1;
    pdfChangeWait();
}

// Blocks updates to the PDF
function pdfChangeWait() {
    // Attempt to parse the decklists and validate input every 400ms
    if (decklistChangeTimer) { clearTimeout(decklistChangeTimer); }
    decklistChangeTimer = setTimeout(function() { parseDecklist(); validateInput(); }, 400);

    // Wait 1500 milliseconds to generate a new PDF
    if (pdfChangeTimer) { clearTimeout(pdfChangeTimer); }
    pdfChangeTimer = setTimeout(generatePlaytestPDF, 1500);
}

// Detect if there is PDF support for the autopreview
function detectPDFPreviewSupport() {
    showpreview = false;

    // Safari and Chrome have application/pdf in navigator.mimeTypes
    if (navigator.mimeTypes['application/pdf'] != undefined) { showpreview = true; }

    // Firefox desktop uses pdf.js, but not mobile or tablet
    if (navigator.userAgent.indexOf('Firefox') != -1) {
        if ((navigator.userAgent.indexOf('Mobile') == -1) && (navigator.userAgent.indexOf('Tablet') == -1)) { showpreview = true; }
        else { showpreview = false; } // have to reset it, as FF Mobile application/pdf listed, but not supported (wtf?)
    }
}

// Generates the part of the PDF that never changes (lines, boxes, etc.)
function generatePlaytestLayout() {
    // Create a new dl
    pt = new jsPDF('portrait', 'pt', 'a4');

    //addTemplateToPage(pt);

    return(pt);
}

function addCardsToPage(dl) {
    // Filter out the blanks
    var goodCardsNames = jQuery.map(goodcards, function(value, index) {
        return value['name'];
    });

    maindeck = jQuery.grep(maindeck, function(value) {
        return ((value[0] != "") && ($.inArray(value[0], goodCardsNames) != -1));
    });

    if(maindeck == []) { return; }

    // Expand the quantities
    var expandedMainDeck = []
    maindeck.forEach(function(element, index, array) {
        if (element[1] != 0) {
            for(var c = 0; c < element[1]; c++)
            {
                expandedMainDeck.push(element[0]);
            }
        }
    });

    var numPages = 0;
    var x = 17;
    var y = 11;

    var card_width = 172;
    var card_height = 243;

    // Card Coordinates
    var name_under_line_height = 16;
    var art_under_line_height = 106;
    var type_under_line_height = 120;
    var text_under_line_height = 225;
    var mana_cost_x;
    var mana_cost_y = 12;
    var name_x = 3;
    var name_y = 60;
    var type_x = 3;
    var type_y = 117;
    var rules_x = 3;
    var rules_y = 135;
    var lines;
    var sizes = [13, 12.5, 12, 11.5, 11, 10.5, 10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6];
    var power_tou_loyalty_y = 239;
    var power_x = 120;
    var toughness_x = 140;
    var powtousep_x = 135;
    var loyalty_x = 135;

    dl.setFontStyle('normal');

    expandedMainDeck.forEach(function(element, index, array) {
        if(index > 8 && ((index % 9 == 0) && expandedMainDeck.length > (9 * (numPages+1))))
        {
            numPages++;
            dl.addPage();
            x = 17;
            y = 11;
        }
        if (index == (3 + (numPages * 9))) { x = 17; y = 274; } // jump to the next row
        if (index == (6 + (numPages * 9))) { x = 17; y = 550; } // jump to the next row

        // Draw outer rectangle
        dl.roundedRect(x, y, card_width, card_height, 10, 10);
        // Draw name under line
        dl.line(x, y+name_under_line_height, x+card_width, y+name_under_line_height);
        // Draw art under line
        dl.line(x, y+art_under_line_height, x+card_width, y+art_under_line_height);
        // Draw type under line
        dl.line(x, y+type_under_line_height, x+card_width, y+type_under_line_height);
        // Draw text box under line
        dl.line(x, y+text_under_line_height, x+card_width, y+text_under_line_height);

        var c = cards[element.toLowerCase()];

        // Draw mana cost
        // Length = Mana Symbols * 3
        dl.setFontSize(12);
        if(c['manaCost'].length < 12) {
            mana_cost_x = 160 - (14 * (c['manaCost'].length / 3));
        } else if(c['manaCost'].length > 18) {
            dl.setFontSize(8);
            mana_cost_x = 50;
        } else {
            dl.setFontSize(11);
            mana_cost_x = 160 - (12 * (c['manaCost'].length / 3));
        }
        dl.text(c['manaCost'], x+mana_cost_x, y+mana_cost_y);

        // Draw Name
        // Can probably fit..18 chars comfortably?
        if(c['name'].length > 22) {
            dl.setFontSize(13);
        } else {
            dl.setFontSize(15);
        }
        dl.text(c['name'], x+name_x, y+name_y);

        // Draw Type
        if(c['type'].length > 31) {
             dl.setFontSize(8);
        } else if(c['type'].length > 18) {
            dl.setFontSize(11);
        } else {
            dl.setFontSize(13);
        }
        dl.text(c['type'], x+type_x, y+type_y);

        // Draw Rules
        // Make basics look good
        switch (c['name']) {
            case 'Plains':
                dl.setFontSize(45);
                dl.text("{W}", x+rules_x+45, y+rules_y+40);
                break;
            case 'Island':
                dl.setFontSize(45);
                dl.text("{U}", x+rules_x+45, y+rules_y+40);
                break;
            case 'Swamp':
                dl.setFontSize(45);
                dl.text("{B}", x+rules_x+45, y+rules_y+40);
                break;
            case 'Mountain':
                dl.setFontSize(45);
                dl.text("{R}", x+rules_x+45, y+rules_y+40);
                break;
            case 'Forest':
                dl.setFontSize(45);
                dl.text("{G}", x+rules_x+45, y+rules_y+40);
                break;
            default:
            var option = {};
            for(var s in sizes) {
                option['fontSize'] = sizes[s];
                var lines = dl.splitTextToSize(c['text'], card_width-5, option);
                dl.setFontSize(sizes[s]);
                if(lines.length <= 7) {
                    break;
                }
            }
            dl.text(lines, x+rules_x, y+rules_y);
        }

        // Draw power/toughness/loyalty
        dl.setFontSize(13);
        if(c['type'].indexOf('Creature') != -1) {
            if(c['power'].length == 1) { power_x += 5; toughness_x += 5; }
            dl.text(c['power'], x+power_x, y+power_tou_loyalty_y);
            dl.text('/', x+powtousep_x, y+power_tou_loyalty_y);
            dl.text(c['toughness'], x+toughness_x, y+power_tou_loyalty_y);
            if(c['power'].length == 1) { power_x -= 5; toughness_x -= 5; }
        } else if(c['type'].indexOf('Planeswalker') != -1) {
            dl.text("{" + c['loyalty'] + "}", x+loyalty_x, y+power_tou_loyalty_y);
        }

        x = x + 189;

    });
}

function generatePlaytestPDF(outputtype) {
    // default type is dataurlstring (live preview)
    // stupid shitty javascript and its lack of default arguments
    outputtype = typeof outputtype !== 'undefined' ? outputtype : 'dataurlstring';

    // clear the input timeout before we can generate the PDF
    pdfChangeTimer = null;

    // don't generate the preview if showpreview == false
    if ((outputtype == 'dataurlstring') && (showpreview == false)) {
        $("#playtestpreview").empty();
        $("#playtestpreview`").html("Automatic decklist preview only supported in non-mobile Firefox, Safari, and Chrome.<br /><br />");
    }

    // Parse the deck list
    parseDecklist();

    // Validate the input
    validateInput();

    pt = generatePlaytestLayout();
    addCardsToPage(pt);

    // Output the dl as a blob to add to the DOM
    if (outputtype == 'dataurlstring') {
        domdl = pt.output('dataurlstring');

        // Put the DOM into the live preview iframe
        $('iframe').attr('src', domdl);
    }
    else if (outputtype == 'raw') {
        rawPDF = pt.output();
        return(rawPDF);
    }
    else {
        pt.save('playtest.pdf');
    }
}

function validateInput() {
    console.log("Validate Input");
}

function parseDecklist() {
    deckmain = $('#deck').val();
    maindeck = [];
    maindeck_count = 0;
    unrecognized = [];
    unparseable = [];
    goodcards = [];
    if (deckmain == '') { return (null, null); }
    deckmain = deckmain.split('\n');

    var mtgoRE   = /^(\d+)x*\s(.+)/; // MTGO deck format (4 Brainstorm) also TCG (4x Brainstorm)

    for (var i = 0; i < deckmain.length; i++) {
        if (mtgoRE.exec(deckmain[i]) != null) {
            quantity = mtgoRE.exec(deckmain[i])[1];
            card = mtgoRE.exec(deckmain[i])[2];

            recognizeCard(card, quantity);
        } else {
            if(deckmain[i] != '') {
                card = deckmain[i];
                quantity = '1';
                recognizeCard(card, quantity);
            }
        }
    }
    maindeck = sortDecklist(maindeck, 'alphabetically');

    function recognizeCard(card, quantity, list) {
        list = list || 'main';
        card = card.trim();

        //if (card.slice(0,2).toLowerCase() === 'ae') { recognized = objectHasPropertyCI(cards, '\u00e6'+card.slice(2)); }
        //else { recognized = objectHasPropertyCI(cards, card); }
        card = card.replace("’", "'");
        recognized = objectHasPropertyCI(cards, card);

        // Always add the card to the list, regardless of if the card is recognized
        // Still, if not recognized, add it to its special dictionary (unrecognized)

        if (recognized) {
            list_add(list, recognized.name, quantity);
            goodcards.push(recognized);
        } else {
            list_add(list, card, quantity);
            unrecognized.push(htmlEncode(card));
        }
    }

    function objectHasPropertyCI(obj, val) {
        for (var p in obj) {
            if (obj.hasOwnProperty(p) && p.toLowerCase() === val.toLowerCase()) {
                return obj[p];
            }
        }
        return false;
    }

    function sortDecklist(deck, sortorder) {
        // Sort the decklist alphabetically, if chosen
        if ( sortorder == 'alphabetically' ) {
            // Add a case insensitive field to sort by
            for (i = 0; i < deck.length; i++) {
                deck[i] = [ deck[i][0].toLowerCase(), deck[i][0], deck[i][1] ];
            }

            deck.sort();

            // After sorting is done, we can remove the lower case index
            for (i = 0; i < deck.length; i++) {
                deck[i] = deck[i].splice(1, 2);
            }
        }
        return(deck);
    }

    console.log("Unrecognised cards: ");
    unrecognized.forEach(function(element, index, array) {
        console.log(element);
    });
}

function list_add(type, card, quantity) {
  if (type === 'main') {
    cardIndex = listContainsCard(maindeck,card);
    if (cardIndex !== -1) {
      // arggh, strings!
      maindeck[cardIndex][1] = parseInt(maindeck[cardIndex][1]) + parseInt(quantity) + '';
    } else {
      maindeck.push([card, quantity]);
    }
    maindeck_count += parseInt(quantity);
  } else if (type === 'side') {
    cardIndex = listContainsCard(sideboard,card);
    if (cardIndex !== -1) {
      // arggh, strings!
      sideboard[cardIndex][1] = parseInt(sideboard[cardIndex][1]) + parseInt(quantity) + '';
    } else {
      sideboard.push([card, quantity]);
    }
    sideboard_count += parseInt(quantity);
  }

  // Returns the index of the card:quantity pair within the given list, or -1 if not found
  function listContainsCard(list, card) {
    for (j=0; j < list.length; j++) {
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

