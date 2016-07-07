/* jslint browser: true */
/* global $, jQuery, jsPDF */

// global timeout filters
var decklistChangeTimer = null;
var pdfChangeTimer = null;
var cardQuantity = 1;

// When the page loads, generate a blank deck list preview
$(document).ready(function() {
    // bind events to all the input fields on the left side, to generate a PDF on change
    $('div.left input, div.left textarea').on('input', pdfChangeWait);
    $("select[name=eventformat]").on("change", pdfChangeWait);
    $("#eventdate, input[type='radio']").change(pdfChangeWait);

    // bind a date picker to the event date (thanks, jQuery UI)
    // also skin the upload and download button
    $("#eventdate").datepicker({ dateFormat: "yy-mm-dd" }); // ISO-8601, woohoo
    $("#download").button();
    $("#downloadcsv").button();
    $('#upload').button();
    $('#getplaytest').button();
    $('#deckcheck').button();
    $('#deckcheck').hide();
    $("#sortorderfloat").buttonset();

    $("#cardtomain").button();
    $("#cardtoside").button();

    var cardNames = [];
    var numberRegExp = /^([0-9]+) (.*)$/;
    $.each(cards, function(key, value) { cardNames.push(cards[key]["n"]) })

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
        if(event.altKey && event.keyCode == 13) {
            cardToSide();
        } else if(event.keyCode == 13) {
            cardToMain();
        }
    });

    // initialize field tooltips, replace | with <br /> in tooltip content
    $(".left input, .left textarea").tooltip({
        content: function(callback) {
            callback($(this).prop("title").replace(/\|/g, "<br />"));
        },
        position: {
            my: "right top+10",
            at: "right bottom",
            collision: "flipfit"
        },
        tooltipClass: "tooltip"
    });

    // detect browser PDF support
    detectPDFPreviewSupport();

    // parse the GET parameters and set them, also generates preview (via event)
    parseGET();
});

function cardToMain() {
    if($("#cardentry").val() == "") {
        return;
    }
    if($("#deckmain").val() == "") {
        linebreak = "";
    } else {
        linebreak = "\r\n";
    }
    $("#deckmain").val($("#deckmain").val() + linebreak + cardQuantity + " " + $("#cardentry").val());
    $("#cardentry").val("");
    cardQuantity = 1;
    pdfChangeWait();
}

function cardToSide() {
    if($("#cardentry").val() == "") {
        return;
    }
    if($("#deckside").val() == "") {
        linebreak = "";
    } else {
        linebreak = "\r\n";
    }
    $("#deckside").val($("#deckside").val() + linebreak + cardQuantity + " " + $("#cardentry").val());
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
    pdfChangeTimer = setTimeout(generateDecklistPDF, 1500);

    $("#URL")[0].innerText = "";
}

// Good ol' Javascript, not having a capitalize function on string objects
String.prototype.capitalize = function() {
    // return this.replace( /(^|\s)([a-z])/g, function(m,p1,p2) { return p1+p2.toUpperCase(); } );
    return this.replace( /(^)([a-z])/g, function(m,p1,p2) { return p1+p2.toUpperCase(); } ); // 1st char
};

// A way to get the GET parameters, setting them in an array called $._GET
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
    var params = ['firstname', 'lastname', 'dcinumber', 'event', 'eventdate', 'eventlocation', 'deckname', 'deckdesigner', 'deckmain', 'deckside', 'eventformat'];

    // check for event, eventdate, or eventlocation and lock down those input fields
    for (var i = 0; i < params.length; i++) {
        var param = params[i];
        var field = '#' + param;

        if ($._GET[ param ] != undefined) {
            if (param != "eventformat") {
                $(field).val( $._GET[param] ); // set it to the GET variable
            }
            else {
                $("select[name=eventformat] option[value=" + $._GET[param] + "]").prop('selected', true);
                $("select[name=eventformat]").prop("disabled", true);
            }

            if ((param != "deckmain") && (param != "deckside")) {
                $(field).prop("disabled", true);  // disable all decklist fields that are in the URL
            } else {
                $(field).attr("disabled", true);
                $("#cardentry").prop("disabled", true);
            }
        }
    }

    // load the logo
    //if ($._GET['logo'] == undefined) { $._GET['logo'] = 'gaslogo'; } // if logo isn't specified, use the Gas logo
    if ($._GET['logo'] == undefined) { $._GET['logo'] = 'auseternal'; } // if logo isn't specified, use the Gas logo
    var logos = ['dcilogo', 'auseternal', 'gaslogo'];

    for (var i = 0; i < logos.length; i++) {
        if ($._GET['logo'] == logos[i]) {
            var element = document.createElement("script");

            element.src = 'images/' + logos[i] + '.js';
            element.type = "text/javascript";
            element.id = "logo";
            element.onload = function () { generateDecklistPDF(); };

            document.getElementsByTagName("head")[0].appendChild(element);
        }
    }

    // make the upload button visible, if uploadURL exists
    if($._GET["uploadURL"] != undefined) {
        $("#upload").css("display", "inline-block");
    }

    // If the deck is filled in, let's make Deck Check mode available
    if($._GET["deckmain"] != undefined) {
        $('#deckcheck').show();
    }
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

function addLogoToDL(dl) {
    for(var i = 1; i <= dl.internal.getNumberOfPages(); i++) {
        dl.setPage(i);
        if($("select[name=eventformat]").val() == "Highlander") {
            dl.addImage(logo, 'JPEG', 30, 17, 50, 40);
        } else {
            dl.addImage(logo, 'JPEG', 27, 30, 90, 70);
        }
    }
}

function addHLTemplateToDL(dl) {
    //dl.addImage(logo, 'JPEG', 30, 17, 50, 40); // AusEternal
    //dl.addImage(logo, 'JPEG', 30, 17, 50, 40); // Gas

    dl.setFontSize(13);
    dl.setFontStyle('bold');

    dl.setLineWidth(1);
    dl.text('Last Name', 90, 23);
    dl.rect(163, 10, 140, 19);
    dl.text('First Name', 310, 23);
    dl.rect(380, 10, 145, 19);
    dl.text('DCI Number', 530, 23);
    var x = 610;
    while (x < 760) {
        dl.rect(x, 10, 15, 19);  // dci digits
        x = x + 15;
    }
    // Event Name, Deck Name, Deck Designer
    dl.text('Deck Name', 90, 50);
    dl.rect(163, 38, 140, 19);
    dl.text('Deck Designer', 310, 50);
    dl.rect(402, 38, 123, 19);
    dl.text('Event', 530, 50);
    dl.rect(570, 38, 200, 19);



    var i;
    var y;
    var ymax;
    var x;

    // Quantity Columns
    // Last one 533, 403
    for(i = 0; i < 3; i++) {
        y = 63;
        x = 31 + (251 * i);
        if(i < 2) {
            ymax = 470;
        } else {
            ymax = 420;
        }
        while(y < ymax) {
            dl.rect(x, y, 45, 20);
            y = y + 20;
        }
    }
    // And sideboard ones
    dl.setFillColor(190);
    for(i = 0; i < 3; i++) {
        y = 493;
        x = 31 + (251 * i);

        while(y < 590) {
            dl.rect(x, y, 45, 20, 'FD');
            y = y + 20;
        }
    }

    // Card columns
    // Last one 578, 403
    for(i = 0; i < 3; i++) {
        y = 63;
        x = 76 + (251 * i);
        if(i < 2) {
            ymax = 470;
        } else {
            ymax = 420;
        }
        while(y < ymax) {
            dl.rect(x, y, 192, 20);
            y = y + 20;
        }
    }
    // And sideboard ones
    dl.setFillColor(190);
    for(i = 0; i < 3; i++) {
        y = 493;
        x = 76 + (251 * i);

        while(y < 590) {
            dl.rect(x, y, 192, 20, 'FD');
            y = y + 20;
        }
    }


    dl.rect(684, 444, 86, 19); // Box for main deck total
    dl.rect(684, 464, 86, 19); // Box for side board total

    // Shaded rectangles
    dl.setLineWidth(1);
    dl.setFillColor(150);
    //dl.setDrawColor(150);
    dl.rect(268.5, 62.5, 13, 421, 'F'); // Long line between Col 1 & 2
    dl.rect(519.5, 62.5, 13, 421, 'F'); // Long line between Col 2 & 3
    dl.rect(533, 423, 237, 20, 'FD'); // Line that says "Total"
    dl.rect(533, 443, 150, 20, 'FD'); // Line that says "Main Deck"
    dl.rect(533, 463, 150, 20, 'FD'); // Line that says "Sideboard"


    dl.text('Total', 680, 438);
    dl.text('Main Deck', 610, 458);
    dl.text('Sideboard', 610, 478);
}

// Generates the part of the PDF that never changes (lines, boxes, etc.)
function addTemplateToDL(dl) {
    // Add the logo
    //dl.addImage(logo, 'JPEG', 27, 54, 90, 32); // AusEternal
    //dl.addImage(logo, 'JPEG', 35, 34, 60, 60); // Gas

    // Create all the rectangles

    // Start with the top box, for deck designer, name, etc.
    dl.setLineWidth(1);
    dl.rect(135, 54, 441, 24);  // date + event
    dl.rect(135, 78, 441, 24);  // location + deck name
    dl.rect(355, 54, 221, 72);  // event + deck name + deck designer
    dl.rect(552, 30, 24, 24);   // first letter
    dl.rect(445, 30, 55, 24);   // table number

    dl.rect(27, 140, 24, 628);  // last name + first name + dci
    dl.rect(27, 140, 24, 270);  // dci
    dl.rect(27, 140, 24, 449);  // first name + dci

    dl.rect(250, 748, 56, 22); // total number main deck
    dl.rect(524, 694, 56, 22); // total number side deck
    dl.rect(320, 722, 260, 48); // judge box


    dl.setLineWidth(.5);
    dl.rect(135, 54, 54, 48);   // date + location
    dl.rect(355, 54, 54, 72);   // event + deck name + deck designer
    dl.rect(320, 722, 130, 48); // official use + dc round + status + judge
    dl.rect(320, 722, 260, 12); // official use + main/sb
    dl.rect(320, 734, 260, 12); // dc round + dc round
    dl.rect(320, 746, 260, 12); // status + status

    var y = 140;
    while (y < 380) {
        dl.rect(27, y, 24, 24);  // dci digits
        y = y + 24;
    }

    // Get all the various notes down on the page
    // There are a ton of them, so this will be exciting
    dl.setFontSize(15);
    dl.setFontStyle('bold');
    dl.setFont('times'); // it's no Helvetica, that's for sure
    dl.text('DECK REGISTRATION SHEET', 135, 45);

    dl.setFontSize(13);
    dl.text('PRINT CLEARLY USING ENGLISH CARD NAMES', 36, 121);

    dl.setFontSize(13);
    dl.text('Main Deck:', 62, 149);
    dl.text('Main Deck Continued:', 336, 149);
    dl.text('Sideboard:', 336, 404);

    dl.setFontSize(11);
    dl.text('# in deck:', 62, 166);  // first row, main deck
    dl.text('Card Name:', 122, 166);
    dl.text('# in deck:', 336, 166); // second row, main deck
    dl.text('Card Name:', 396, 166);
    dl.text('# in deck:', 336, 420); // second row, sideboard
    dl.text('Card Name:', 396, 420);
    dl.text('Total Number of Cards in Main Deck:', 62, 768);
    dl.text('Total Number of Cards in Sideboard:', 336, 714);

    dl.setFontSize(7);
    dl.setFontStyle('normal');
    dl.text('Table', 421, 40);
    dl.text('Number', 417, 48);
    dl.text('First Letter of', 508, 40);
    dl.text('Last Name', 516, 48);
    dl.text('Date:', 169, 68);
    dl.text('Event:', 387, 68);
    dl.text('Location:', 158, 92);
    dl.text('Deck Name:', 370, 92);
    dl.text('Deck Designer:', 362, 116);
    dl.text('First Name:', 41, 581, 90);  // rotate
    dl.text('Last Name:', 41, 760, 90);

    dl.setFontStyle('italic');
    dl.text('DCI #:', 41, 404, 90)    // dci # is rotated and italic

    dl.setFontSize(6);
    dl.setFontStyle('normal');
    dl.text('Deck Check Rd #:', 324, 742); // first row
    dl.text('Status:', 324, 754);
    dl.text('Judge:', 324, 766);

    dl.text('Main/SB:', 454, 730);        // second row
    dl.text('/', 520, 730);
    dl.text('Deck Check Rd #:', 454, 742);
    dl.text('Status:', 454, 754);
    dl.text('Judge:', 454, 766);

    dl.setFontSize(5);
    dl.setFontStyle('bold');
    dl.text('FOR OFFICAL USE ONLY', 324, 730);


    // Now let's create a bunch of lines for putting cards on
    y = 186;
    while(y < 750) // first column of lines
    {
        dl.line(62, y, 106, y);
        dl.line(116, y, 306, y);
        y = y + 18;
    }

    y = 186;
    while(y < 386) // second column of lines (main deck)
    {
        dl.line(336, y, 380, y);
        dl.line(390, y, 580, y);
        y = y + 18;
    }

    y = 438;
    while(y < 696) // second column of lines (main deck)
    {
        dl.line(336, y, 380, y);
        dl.line(390, y, 580, y);
        y = y + 18;
    }

    return(dl);
}

// Generates the part of the PDF that never changes (lines, boxes, etc.)
function generateDecklistLayout() {
    // Create a new dl
    dl = new jsPDF('portrait', 'pt', 'a4');

    addTemplateToDL(dl);

    // Set iFrame W/H
    $("#decklist")[0].height = "580";
    $("#decklist")[0].width = "440";

    return(dl);
}

function generateHLDecklistLayout() {
    dl = new jsPDF('landscape', 'pt', 'a4');

    addHLTemplateToDL(dl);

    // Set iFrame W/H
    $("#decklist")[0].height = "370";
    $("#decklist")[0].width = "470";

    return(dl);
}

function addHLMetadataToDL(dl) {
    dl.setFontStyle('bold');

    lastname = $("#lastname").val().capitalize();
    dl.text(lastname, 165, 23);

    firstname = $("#firstname").val().capitalize();
    dl.text(firstname, 383, 23);

    dcinumber = $("#dcinumber").val();

    // put the DCI number into the PDF
    x = 614;
    if (dcinumber.length > 0) {
        for (var i = 0; i < dcinumber.length; i++) {
            dl.text(dcinumber.charAt(i), x, 23);
            x = x + 15;
        }
    }

    dl.setFontStyle('normal');

    dl.text($("#deckname").val().capitalize(), 165, 50);
    dl.text($("#deckdesigner").val().capitalize(), 404, 50);
    if($("#eventdate").val() != "") {
        dl.text($("#event").val().capitalize() + ' (' + $("#eventdate").val() + ')', 572, 50);
    } else {
        dl.text($("#event").val().capitalize(), 572, 50);
    }
}

function addMetaDataToDL(dl) {
    // Helvetica, fuck yeah
    dl.setFont('helvetica');
    dl.setFontSize(11);

    // put the event name, deck designer, and deck name into the PDF
    dl.setFontStyle('normal');
    dl.text($("#eventdate").val(), 192, 69.5);
    dl.text($("#eventlocation").val().capitalize(), 192, 93.5);
    dl.text($("#event").val().capitalize(), 412, 69.5);
    dl.text($("#deckname").val().capitalize(), 412, 93.5);
    dl.text($("#deckdesigner").val().capitalize(), 412, 117.5);

    // put the first name into the PDF
    dl.setFontStyle('bold');
    firstname = $("#firstname").val().capitalize();
    dl.text(firstname, 43, 544, 90);

    // put the last name into the PDF
    lastname = $("#lastname").val().capitalize();  // the side bar
    if (lastname.length > 0) {
        // lastname = capitalize(lastname);
        dl.text(lastname, 43, 724, 90);

        dl.setFontSize(20);

        // Getting the character perfectly aligned in the center of the box is super tricky, since it's hard to
        // get a glyph width.  So we manually fix some
        lnfl = lastname.charAt(0);
        offset = 0;

        switch (lnfl) {
            case 'I': offset = 4; break;
            case 'J': offset = 1; break;
            case 'M': offset = -1; break;
            case 'Q': offset = -1; break;
            case 'X': offset = 1; break;
            case 'Y': offset = .5; break;
            case 'W': offset = -2; break;
            case 'Z': offset = 1; break;
        }

        dl.text(lnfl, 557 + offset, 49);
        dl.setFontSize(12);
    }

    dcinumber = $("#dcinumber").val();

    // put the DCI number into the PDF
    y = 372;
    if (dcinumber.length > 0) {
        for (var i = 0; i < dcinumber.length; i++) {
            dl.text(dcinumber.charAt(i), 43, y, 90);
            y = y - 24;
        }
    }
    dl.setFontStyle('normal');
}

function addHLCardsToDL(dl) {
    // Strip the empty lines sorting gives us, since we can fit exactly 60 on one page
    // Maybe we can get a little bit smarter and leave as many in as possible in case basic lands free up some individual lines
    maindeck = jQuery.grep(maindeck, function(value) {
        return value[0] != "";
    });

    // Add the deck to the decklist
    var x = 47;
    var y = 78;
    var numPages = 0;
    dl.setFontStyle('normal');
    if (maindeck != []) {
        for (i = 0; i < maindeck.length; i++) {
            if(i > 0 && ((i % 60 == 0) && maindeck.length > (60 * (numPages+1))))
            {
                numPages++;
                dl.addPage();
                addHLTemplateToDL(dl);
                addHLMetadataToDL(dl);
                x = 47;
                y = 78;
            }
            if (i == (21 + (numPages * 60))) { x = 300; y = 78; } // jump to the next row
            else if (i == (42 + (numPages * 60))) { x = 550; y = 78; } // jump to the next row

            // Ignore zero quantity entries (blank)
            if(maindeck[i][1] != 0) {
                dl.text(maindeck[i][1], x, y);
                cardtext = maindeck[i][0];
                goodcards.forEach(function(element, index, array) {
                    if(element.n == cardtext) {
                        if (typeof element.p === 'undefined') { element.p = 0; }
                        cardtext = cardtext + " " + Array(element.p+1).join("*");
                    }
                });
                dl.text(cardtext, x + 38, y);

            }
            y = y + 20;  // move to the next row
        }
    }

    // Add the sideboard to the decklist
    var x = 47;
    var y = 508;
    if (sideboard != []) {
        for (i = 0; i < sideboard.length; i++) {
            if (i == 5) { x = 300; y = 508; } // jump to the next row
            if (i == 10) { x = 550; y = 508; } // jump to the next row

            dl.text(sideboard[i][1], x, y);
            cardtext = sideboard[i][0];
            goodcards.forEach(function(element, index, array) {
                if(element.n == cardtext) {
                    if (typeof element.p === 'undefined') { element.p = 0; }
                    cardtext = cardtext + " " + Array(element.p+1).join("*");
                }
            });
            dl.text(cardtext, x + 38, y);
            y = y + 20;  // move to the next row
        }
    }

    // Add the maindeck count and sideboard count
    dl.setFontSize(20);
    if (maindeck_count != 0)  { dl.text(String(maindeck_count), 710, 460); }
    if (sideboard_count != 0) {
        if (sideboard_count < 10) { dl.text(String(sideboard_count), 714, 480); }
        else { dl.text(String(sideboard_count), 709, 480); }
    }
}

function addCardsToDL(dl) {
    // Add the deck to the decklist
    var x = 82;
    var y = 182;
    var numPages = 0;
    dl.setFontStyle('normal');
    if (maindeck != []) {
        for (i = 0; i < maindeck.length; i++) {
            if(i > 0 && ((i % 44 == 0) && maindeck.length > (44 * (numPages+1))))
            {
                numPages++;
                dl.addPage();
                addTemplateToDL(dl);
                addMetaDataToDL(dl);
                x = 82;
                y = 182;
            }
            if (i == (32 + (numPages * 44))) { x = 356; y = 182; } // jump to the next row

            // Ignore zero quantity entries (blank)
            if (maindeck[i][1] != 0) {
                dl.text(maindeck[i][1], x, y);
                dl.text(maindeck[i][0], x + 38, y);
            }

            y = y + 18;  // move to the next row
        }
    }

    // Add the sideboard to the decklist
    var x = 356;
    var y = 434;
    if (sideboard != []) {
        for (i = 0; i < sideboard.length; i++) {
            dl.text(sideboard[i][1], x, y);
            dl.text(sideboard[i][0], x + 38, y);
            y = y + 18;  // move to the next row
        }
    }

    // Add the maindeck count and sideboard count
    dl.setFontSize(20);
    if (maindeck_count != 0)  { dl.text(String(maindeck_count), 268, 766); }
    if (sideboard_count != 0) {
        if (sideboard_count < 10) { dl.text(String(sideboard_count), 547, 712); }
        else { dl.text(String(sideboard_count), 541, 712); }
    }
}

function addQRCodeToPDF(dl) {
    var qrcode = kjua({
        render: 'image',
        crisp: 'true',
        size: '150',
        ecLevel: 'L',
        minVersion: 15,
        quiet: 0,
        rounded: 0,
        text: openDeckWindow('qrcode')
    });
    for(var i = 1; i <= dl.internal.getNumberOfPages(); i++) {
        dl.setPage(i);
        if($("select[name=eventformat]").val() == "Highlander") {
            dl.addImage(qrcode, 'PNG', 30, 10, 52, 52);
        } else {
            dl.addImage(qrcode, 'PNG', 30, 17, 90, 90);
        }
    }
}

function generateDecklistPDF(outputtype) {
    // default type is dataurlstring (live preview)
    // stupid shitty javascript and its lack of default arguments
    outputtype = typeof outputtype !== 'undefined' ? outputtype : 'dataurlstring';

    // clear the input timeout before we can generate the PDF
    pdfChangeTimer = null;

    // don't generate the preview if showpreview == false
    if ((outputtype == 'dataurlstring') && (showpreview == false)) {
        $("#decklistpreview").empty();
        $("#decklistpreview").html("Automatic decklist preview only supported in non-mobile Firefox, Safari, and Chrome.<br /><br />");
    }

    // Parse the deck list
    parseDecklist();

    // Validate the input
    validateInput();

    // start with the blank PDF
    if($("select[name=eventformat]").val() == "Highlander") {
        dl = generateHLDecklistLayout();
        addHLMetadataToDL(dl);
        addHLCardsToDL(dl);
    } else {
        dl = generateDecklistLayout();
        addMetaDataToDL(dl);
        addCardsToDL(dl);
    }

    // Output the dl as a blob to add to the DOM
    if (outputtype == 'dataurlstring') {
        //addQRCodeToPDF(dl);
        addLogoToDL(dl);
        domdl = dl.output('dataurlstring');

        // Put the DOM into the live preview iframe
        $('iframe').attr('src', domdl);
    }
    else if (outputtype == 'raw') {
        rawPDF = dl.output();
        return(rawPDF);
    }
    else if (outputtype == 'csv') {
        var data = $("#firstname").val().capitalize() + ' ' + $("#lastname").val().capitalize() + ' ' + $("#dcinumber").val() + '\r\n';
        data += $("#eventdate").val() + ' ' + $("#eventlocation").val().capitalize() + ' ' + $("#event").val().capitalize() + '\r\n';
        data += "Main Deck\r\n";
        for (i = 0; i < maindeck.length; i++) {
            if (maindeck[i][1] != 0) {
                data += maindeck[i][1] + ' ';
                if($("select[name=eventformat]").val() == "Highlander") {
                    cardtext = maindeck[i][0];
                    goodcards.forEach(function(element, index, array) {
                        if(element.n == cardtext) {
                            if (typeof element.p === 'undefined') { element.p = 0; }
                            cardtext = cardtext + " " + Array(element.p+1).join("*");
                        }
                    });
                    data += cardtext;
                } else {
                    data += maindeck[i][0];
                }
                data += '\r\n';
            }
        }
        if (sideboard != []) {
            data += "\r\nSideboard\r\n";
            for (i = 0; i < sideboard.length; i++) {
                data += sideboard[i][1] + ' ';
                if($("select[name=eventformat]").val() == "Highlander") {
                    cardtext = sideboard[i][0];
                    goodcards.forEach(function(element, index, array) {
                        if(element.n == cardtext) {
                            if (typeof element.p === 'undefined') { element.p = 0; }
                            cardtext = cardtext + " " + Array(element.p+1).join("*");
                        }
                    });
                    data += cardtext;
                } else {
                    data += sideboard[i][0];
                }
                data += '\r\n';
            }
        }

        var aLink = document.createElement('a');
        var evt = document.createEvent("HTMLEvents");
        evt.initEvent("click");
        aLink.download = 'decklist.csv';
        aLink.href = 'data:text/csv;charset=UTF-8,' + encodeURIComponent(data);
        aLink.dispatchEvent(evt);
    }
    else {
        addQRCodeToPDF(dl);
        dl.save('decklist.pdf');
    }
}

// performs a number of checks against the values filled out in the fields
// and stores any warnings or errors found during these checks within a
// validation object which is used to generate tooltip and status box text
function validateInput() {
    // validation object
    // key = HTML form object (input or textarea) ID
    // value = array of error objects: {error_level: error_type}
    // error levels include 'warning' and 'error'
    // error types include 'blank', 'nonnum', 'toolarge', 'toosmall',
    //       'size', 'unrecognized', 'quantity', 'futuredate'
    validate = {
        'firstname': [],
        'lastname': [],
        'dcinumber': [],
        'event': [],
        'eventdate': [],
        'eventlocation': [],
        'deckmain': [],
        'deckside': [],
        'format' : []
    };

    // check first name (non-blank, too long)
    if ($('#firstname').val() === '') {
        validate.firstname.push({'warning': 'blank'});
    } else if ($('#firstname').val().length > 20) {
        validate.firstname.push({'error': 'toolarge'});
    }

    // check last name (non-blank, too long)
    if ($('#lastname').val() === '') {
        validate.lastname.push({'warning': 'blank'});
    } else if ($('#lastname').val().length > 20) {
        validate.lastname.push({'error': 'toolarge'});
    }

    // check DCI number (non-blank, numeric, < 11 digits)
    if ($('#dcinumber').val() === '') {
        validate.dcinumber.push({'warning': 'blank'});
    } else if (!$('#dcinumber').val().match(/^[\d]+$/)) {
        validate.dcinumber.push({'error': 'nonnum'});
    }
    if ($('#dcinumber').val().length >= 11) {
        validate.dcinumber.push({'error': 'toolarge'});
    }

    // check event name (non-blank)
    if ($('#event').val() === '') {
        validate.event.push({'warning': 'blank'});
    }

    // check event date (non-blank, unrecognized format, before today)
    if ($('#eventdate').val() === '') {
        validate.eventdate.push({'warning': 'blank'});
    } else if (!$('#eventdate').val().match(/^\d{4}\-\d{2}\-\d{2}$/)) {
        validate.eventdate.push({'error': 'unrecognized'});
    } else if (Date.parse($('#eventdate').val()) <= new Date(new Date().setDate(new Date().getDate()-1)).setHours(0)) {
        validate.eventdate.push({'warning': 'futuredate'});
    }

    // check event location (non-blank)
    if ($('#eventlocation').val() === '') {
        validate.eventlocation.push({'warning': 'blank'});
    }

    // check maindeck (size, number of unique cards)
    if ((maindeck_count == 0) || (maindeck_count > 60)) {
        validate.deckmain.push({'warning': 'size'});
    } else if (maindeck_count < 60) {
        validate.deckmain.push({'error': 'toosmall'});
    }

    // check sideboard (size)
    if (sideboard_count > 15) { validate.deckside.push({'error': 'toolarge'});}
    if (sideboard_count < 15) { validate.deckside.push({'warning': 'toosmall'}); }

    // check combined main/sb (quantity of each unique card, unrecognized cards)
    mainPlusSide = mainAndSide();
    excessCards = [];
    allowedDupes = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest',
    'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp', 'Snow-Covered Mountain',
    'Snow-Covered Forest', 'Wastes', 'Relentless Rats', 'Shadowborn Apostle'];
    for (i = 0; i < mainPlusSide.length; i++) {
        var maxNumber = 4;
        if($("select[name=eventformat]").val() == "Highlander") { maxNumber = 1; }
        else if($("select[name=eventformat]").val() == "Vintage") {
            goodcards.forEach(function(element, index, array) {
                if((element.r).indexOf('v') != -1) {
                    maxNumber = 1;
                }
            });
        }

        if (parseInt(mainPlusSide[i][1]) > maxNumber) {
            allowed = false;
            allowedDupes.forEach(function(element, index, array){
                allowed = allowed || element === mainPlusSide[i][0];
            });
            if (!allowed) { excessCards.push(mainPlusSide[i][0]); }
        }
    }
    if (excessCards.length) { validate.deckmain.push({'error': 'quantity'}); }

    illegalCards = [];

    if($("select[name=eventformat]").val() == "Standard") {
        goodcards.forEach(function(element, index, array) {
            if((element.b).indexOf('s') != -1) {
                illegalCards.push(element.n);
            }
        });
    } else if($("select[name=eventformat]").val() == "Modern") {
        goodcards.forEach(function(element, index, array) {
            if((element.b).indexOf('m') != -1) {
                illegalCards.push(element.n);
            }
        });
    } else if($("select[name=eventformat]").val() == "Highlander") {
        totalHLPoints = 0;
        goodcards.forEach(function(element, index, array) {
            totalHLPoints += element.p;
        });
        if (totalHLPoints > 7) { validate.format.push({"error": "toomanypoints"}); }
        if (totalHLPoints < 7) { validate.format.push({"warning": "toofewpoints"}); }
        goodcards.forEach(function(element, index, array) {
            if((element.b).indexOf('v') != -1) {
                illegalCards.push(element.n);
            }
        });
    } else if($("select[name=eventformat]").val() == "Legacy") {
        goodcards.forEach(function(element, index, array) {
            if((element.b).indexOf('l') != -1) {
                illegalCards.push(element.n);
            }
        });
    } else if($("select[name=eventformat]").val() == "Vintage") {
        goodcards.forEach(function(element, index, array) {
            if((element.b).indexOf('v') != -1) {
                illegalCards.push(element.n);
            }
        });
    }

    if (illegalCards.length) { validate.format.push({'error': 'notlegal'}); }

    unrecognizedCards = {};
    unparseableCards = [];
    if (Object.getOwnPropertyNames(unrecognized).length !== 0) {
        unrecognizedCards = unrecognized;
        validate.deckmain.push({'warning': 'unrecognized'});
    }
    if (unparseable.length !== 0) {
        unparseableCards = unparseable;
        validate.deckmain.push({'warning': 'unparseable'});
    }

    // pass validation data to output status/tooltip information
    statusAndTooltips(validate);
}

// returns an array that is a combination of the main and sideboards
// note: does not duplicate entries found in both arrays; combines them instead
function mainAndSide() {
    // make deep copies by value of the maindeck and sideboard
    combined = $.extend(true,[],maindeck);
    sideQuants = $.extend(true,[],sideboard);

    // combine the cards!
    combined.map(addSideQuants);
    combined = combined.concat(sideQuants);

    return combined;

    // mapping function; adds quantities of identical names in main/side
    // and removes those matching cards from sideQuants
    function addSideQuants(element) {
        foundSideElement = false;
        for (i = 0; i < sideQuants.length && sideQuants.length && foundSideElement === false; i++) {
            if (sideQuants[i][0] === element[0]) {
                foundSideElement = i;
            }
        }
        if (typeof foundSideElement === 'number') {
            element[1] = (parseInt(element[1]) + parseInt(sideQuants[foundSideElement][1])).toString();
            sideQuants.splice(foundSideElement, 1);
        }
        return element;
    }
}

// Change tooltips and status box to reflect current errors/warnings (or lack thereof)
function statusAndTooltips(valid) {
    // notifications are stored as the following:
    // notifications: {
    //   for: [[message, level], [message, level], ...],
    //   for: [[message, level], [message, level], ...],
    //   ...
    // }
    // in this case, the key 'for' represents the input element id, and
    // the value 'level' represents the string 'warning' or 'error'
    notifications = {};

    // define push method for notifications
    // accepts a key and an array (assumed [message, level] input)
    // if the key does not exist, add [array], else push it to that key's array
    notifications.push = function(key, array) {
        if (typeof this[key] === 'undefined') {
            this[key] = [array];
        } else {
            this[key].push(array);
        }
    }

    // 0x000 is valid, 0x001 is empty, 0x010 is warning, 0x100 is error
    // default error level to 'valid'
    errorLevel = 0;

    // check for validation objects in every category (firstname, lastname, etc.)
    for (prop in valid) {
        // check each instance of a warning/error per field
        proplength = valid[prop].length;
        for (i=0; i < proplength; i++) {
            validationObject = valid[prop][i];

            // store validation object type for abstraction
            validType = (validationObject['warning'] ? 'warning' : 'error');

            // bitwise AND the current error level and that of the validation object
            errorLevel = errorLevel | (validType === 'warning' ? 0x010 : 0x100);

            // add notification message for the validation object
            //   note: this section runs only once per validation object, so all checks
            //   can be run in else-if blocks; only one update is made per object

            if (prop === 'firstname') {
                if (validationObject['warning'] === 'blank') {
                    notifications.push(prop, ['Missing first name', validType]);
                } else if (validationObject['error'] === 'toolarge') {
                    notifications.push(prop, ['First name too long', validType]);
                }
            } else if (prop === 'lastname') {
                if (validationObject['warning'] === 'blank') {
                    notifications.push(prop, ['Missing last name', validType]);
                } else if (validationObject['error'] === 'toolarge') {
                    notifications.push(prop, ['Last name too long', validType]);
                }
            } else if (prop === 'dcinumber') {
                if (validationObject['warning'] === 'blank') {
                    notifications.push(prop, ['Missing DCI number', validType]);
                } else if (validationObject['error'] === 'nonnum') {
                    notifications.push(prop, ['DCI number must contain only numbers', validType]);
                } else if (validationObject['error'] === 'toolarge') {
                    notifications.push(prop, ['DCI numbers must be 10 digits or fewer', validType]);
                }
            } else if (prop === 'event') {
                if (validationObject['warning'] === 'blank') {
                    notifications.push(prop, ['Missing event name', validType]);
                }
            } else if (prop === 'eventdate') {
                if (validationObject['warning'] === 'blank') {
                    notifications.push(prop, ['Missing event date', validType]);
                } else if (validationObject['warning'] === 'futuredate') {
                    notifications.push(prop, ['Event date is set in the past', validType]);
                } else if (validationObject['error'] === 'unrecognized') {
                    notifications.push(prop, ['Event dates should be in the following format: YYYY-MM-DD', validType]);
                }
            } else if (prop === 'eventlocation') {
                if (validationObject['warning'] === 'blank') {
                    notifications.push(prop, ['Missing event location', validType]);
                }
            } else if (prop === 'deckmain') {
                if (validationObject['warning'] === 'size') {
                    notifications.push(prop, ['Most decks consist of exactly 60 cards', validType]); }
                else if (validationObject['error'] === 'toosmall') {
                    notifications.push(prop, ['Decks may not consist of fewer than 60 cards', validType]);
                } else if (validationObject['error'] === 'toolarge') {
                    notifications.push(prop, ['This PDF only has space for up to 44 unique cards (including spaces)', validType]);
                } else if (validationObject['error'] === 'quantity') {
                    // include a list of cards that exceed 4 across the main/side
                    excessCardsHtml = '<ul><li>' + excessCards.join('</li><li>') + '</li></ul>';
                    notifications.push(prop, ['The following cards exceed the maximum allowable number of copies:' + excessCardsHtml, validType]);
                } else if (validationObject['warning'] === 'unrecognized') {
                    // include a list of unrecognized card names
                    unrecognizedCardsHtml = '<ul><li>' + Object.getOwnPropertyNames(unrecognizedCards).join('</li><li>') + '</li></ul>';
                    notifications.push(prop, ['Couldn\'t recognise the following card(s):' + unrecognizedCardsHtml, validType]);
                } else if (validationObject['warning'] === 'unparseable') {
                    // include a list of unparseable lines
                    unparseableCardsHtml = '<ul><li>' + unparseableCards.join('</li><li>') + '</li></ul>';
                    notifications.push(prop, ['Couldn\'t parse the following lines:' + unparseableCardsHtml, validType]);
                }
            } else if (prop === 'deckside') {
                if (validationObject['warning'] === 'toosmall') {
                    notifications.push(prop, ['Most sideboards consist of exactly 15 cards', validType]);
                } else if (validationObject['error'] === 'toolarge') {
                    notifications.push(prop, ['Sideboards may not consist of more than 15 cards', validType]);
                }
            } else if (prop === "format") {
                if (validationObject["error"] === "toomanypoints") {
                    notifications.push(prop, ["Highlander lists may contain a maximum of 7 points (You have " + totalHLPoints + ")", validType]);
                } else if(validationObject["warning"] === "toofewpoints") {
                    notifications.push(prop, ["Most Highlander lists contain 7 points", validType]);
                } else if (validationObject["error"] === "notlegal") {
                    illegalCardsHtml = '<ul><li>' + illegalCards.join('</li><li>') + '</li></ul>';
                    notifications.push(prop, ["List contains card/s not legal in the format:" + illegalCardsHtml, validType]);
                }
            }
        }
    }

    // check if all fields are empty; if they are, set errorLevel accordingly
    // close active tooltips, clear titles and classes for new tooltip text
    allEmpty = true;
    $('.left input, .left textarea').tooltip('close');
    $('.left input, .left textarea').each(function() {
        if ($(this).val()) {
            allEmpty = false;
        }
        $(this).prop('title', '');
        $(this).removeClass('warning error');
    });
    if (allEmpty) {
        errorLevel = 0x001;
    }

    // compose new notifications HTML fragment, set new tooltips, and set input field classes
    statusBoxHtml = '';
    for (key in notifications) {
        // exclude any functions of the object
        if (typeof notifications[key] !== 'function') {
            newTitle = '';

            notificationsLength = notifications[key].length;
            fieldClass = 'warning';
            for (i=0; i < notificationsLength; i++) {
                // create status box HTML fragment
                statusBoxHtml += '<li class=\'' + notifications[key][i][1] + '\'>';
                statusBoxHtml += '<label for=\'' + key + '\'>';
                statusBoxHtml += notifications[key][i][0] + '</label></li>';

                // determine field class
                if (notifications[key][i][1] === 'error') {
                    fieldClass = 'error';
                }

                // construct field notification string
                if (notificationsLength === 1) {
                    // don't add a bullet, there's only one line for this field
                    newTitle = notifications[key][0][0];
                } else {
                    // don't add a newline denotator (vertical bar) for first entry
                    if (i !== 0) {
                        newTitle += '|';
                    }
                    newTitle += '&bull; ' + notifications[key][i][0];
                }
            }

            // update field class and title
            fieldId = '#' + key;
            $(fieldId).addClass(fieldClass);

            // add a tooltip only for errors; people were complaining about overzealous tooltips
            if (fieldClass === 'error') { $(fieldId).prop('title', newTitle); }
        }
    }

    // compute new status
    newStatus = 'valid';
    if (errorLevel & 0x100)      { newStatus = 'error'; }
    else if (errorLevel & 0x010) { newStatus = 'warning'; }
    else if (errorLevel & 0x001) { newStatus = 'empty'; }

    // set new status, display new notifications
    $('.status').removeClass('default empty valid warning error').addClass(newStatus);
    $('.status .details').html(statusBoxHtml);
}

function uploadDecklistPDF() {
    // generate the raw PDF data
    rawPDF = generateDecklistPDF('raw');

    // grab the URL to POST to, set the action on the form to said URL
    uploadURL = $._GET['uploadURL'];
    $('formupload').attr('action', uploadURL);

    // set the proper input value
    $('#decklistPDF').val(rawPDF);

    // and make a POST, huzzah!
    $('#formupload').submit();
}

function fixForURL(value) {
    return encodeURIComponent(value).replace("'", "%27");
}

function openDeckWindow(windowType) {
    maindeck = jQuery.grep(maindeck, function(value) {
        return value[0] != "";
    });

    var deckURL = '';
    var pageName = windowType;
    if(windowType == 'qrcode') {
        pageName = 'index';
        deckURL = 'http://www.auseternal.com/decklist/'
    }
    deckURL += pageName + '.php?';
    if(windowType == "index" || windowType == 'qrcode') {
        deckURL += 'firstname=' + fixForURL($("#firstname")[0].value);
        deckURL += '&lastname=' + fixForURL($("#lastname")[0].value);
        deckURL += '&dcinumber=' + fixForURL($("#dcinumber")[0].value);
        deckURL += '&eventdate=' + fixForURL(this.eventdate.value);
        deckURL += '&event=' + fixForURL($('#event')[0].value);
        deckURL += '&eventlocation=' + fixForURL(this.eventlocation.value);
        deckURL += '&deckname=' + fixForURL(this.deckname.value);
        deckURL += '&deckdesigner=' + fixForURL(this.deckdesigner.value);
        deckURL += "&eventformat=" +  fixForURL($("select[name=eventformat]").val()) + '&';
    }
    deckURL += 'deckmain=';
    if (maindeck != []) {
        for (i = 0; i < maindeck.length; i++) {
            deckURL += fixForURL(maindeck[i][1] + " " + maindeck[i][0]) + '%0A';
        }
    }
    if (sideboard != []) {
        if(windowType != "playtest") {
            deckURL += '&deckside='
        }

        for (i = 0; i < sideboard.length; i++) {
            deckURL += fixForURL(sideboard[i][1] + " " + sideboard[i][0]) + '%0A';
        }
    }

    if(windowType == 'qrcode') {
        return deckURL;
    }

    $('#URL')[0].innerHTML = '<a href=\'' + deckURL + '\' target=\'_blank\' >Click this link</a>';

    if(windowType != "index") {
        // Try and open the window
        var win = window.open(deckURL, '_blank');
    }
}
