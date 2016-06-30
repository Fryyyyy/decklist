$(document).ready(function() {
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

function proper_split(str, separator, limit) {
    // https://coderwall.com/p/pq0usg/javascript-string-split-that-ll-return-the-remainder
    str = str.split(separator);

    if(str.length > limit) {
        var ret = str.splice(0, limit);
        ret.push(str.join(separator));

        return ret;
    }

    return str;
}

function parseGET() {
    var card_split;
    var card_qty;
    var card_name;
    var i;
    var j = 0;

    if($._GET['deckmain'] != undefined) {
        var cards = $._GET['deckmain'].split("\n");

        for(i = 0; i < cards.length; i++)
        {
            if(cards[i] != "") {
                card_split = proper_split(cards[i], " ", 1);
                card_qty = card_split[0];
                card_name = card_split[1];

                div_starter = "<div id='" + j + "div' tabindex='1'>";
                qty_textbox = "<input type='text' name='" + j + "_box' id='" + j+ "_box' value='" + card_qty + "' disabled size='3'>";
                minusone_textbox = "<input type='button' name='" + j + "_minusone' id='" + j + "_minusone' value='-1' onclick='minusOne(" + j + ", \"deck\");'>";
                if(card_qty != "1") {
                    minusall_textbox = "<input type='button' name='" + j + "_minusall' id ='" + j + "_minusall' value='-" + card_qty + "' onclick='minusAll(" + j+ ", \"deck\");'>";
                } else {
                    minusall_textbox = "";
                }
                reset_button = "<input type='button' name='" + j + "_reset' id='" + j + "_reset' value='Reset' onclick='reset_qty(" + j + ", " + card_qty + ", \"deck\");'>";
                div_ender = "</div>";

                $("#deck").append(div_starter + qty_textbox + minusone_textbox + minusall_textbox + card_name + reset_button + div_ender);

                $("#" + j + "div").keyup(function(event) {
                    var div_id = event.target.id.split("div")[0];
                    if(event.keyCode == 49 || event.keyCode == 97) {
                        minusOne(div_id, 'deck');
                    } else if(event.keyCode == 50 || event.keyCode == 98) {
                        minusAll(div_id, 'deck');
                        var next_qty_id = (parseInt(div_id) + 1);
                        while($("#" + next_qty_id + "_box").val() == "0")
                        {
                            next_qty_id += 1;
                        }
                        $("#" + next_qty_id + "div").focus();
                    }
                });
                j++;
            }
        }
    }
    if($._GET['deckside'] != undefined) {
        var cards = $._GET['deckside'].split("\n");

        for(i = 0; i < cards.length; i++)
        {
            if(cards[i] != "") {
                card_split = proper_split(cards[i], " ", 1);
                card_qty = card_split[0];
                card_name = card_split[1];

                div_starter = "<div id='" + j+ "div' tabindex='1'>";
                qty_textbox = "<input type='text' name='" + j + "_box' id='" + j + "_box' value='" + card_qty + "' disabled size='3'>";
                minusone_textbox = "<input type='button' name='" + j + "_minusone' id='" + j + "_minusone' value='-1' onclick='minusOne(" + j + ", \"sideboard\");'>";
                if(card_qty != "1") {
                    minusall_textbox = "<input type='button' name='" + j + "_minusall' id ='" + j + "_minusall' value='-" + card_qty + "' onclick='minusAll(" + j + ", \"sideboard\");'>";
                } else {
                    minusall_textbox = "";
                }
                reset_button = "<input type='button' name='" + j + "_reset' id='" + j + "_reset' value='Reset' onclick='reset_qty(" + j + ", " + card_qty + ", \"sideboard\");'>";
                div_ender = "</div>";

                $("#sideboard").append(div_starter + qty_textbox + minusone_textbox + minusall_textbox + card_name + reset_button + div_ender);

                $("#" + j + "div").keyup(function(event) {
                    var div_id = event.target.id.split("div")[0];
                    if(event.keyCode == 49 || event.keyCode == 97) {
                        minusOne(div_id, 'sideboard');
                    } else if(event.keyCode == 50 || event.keyCode == 98) {
                        minusAll(div_id, 'sideboard');
                        var next_qty_id = (parseInt(div_id) + 1);
                        while($("#" + next_qty_id + "_box").val() == "0")
                        {
                            next_qty_id += 1;
                        }
                        $("#" + next_qty_id + "div").focus();
                    }
                });
                j++;
            }
        }
    }

    // Focus on first line
    $("#0div").focus();
}

function minusOne(x, source) {
    var value = (parseInt($("#" + x + "_box").val(), 10));
    $("#" + x + "_box").val((value - 1) < 0 ? 0 : (value - 1));

    // If no cards left, move to the bottom (if not already there)
    if(($("#" + x + "_box").val() == "0") && (($("#deckcounted").has($("#" + x + "div")).length == 0) && ($("#sideboardcounted").has($("#" + x + "div")).length == 0)))
    {
        $("#" + x + "div").detach().appendTo("#" + source + "counted");
        // Focus on the next available card
        var next_qty_id = (parseInt(x) + 1);
        while($("#" + next_qty_id + "_box").val() == "0")
        {
            next_qty_id += 1;
        }
        $("#" + next_qty_id + "div").focus();
    }
}

function minusAll(x, source) {
    $("#" + x + "_box").val(0);
    // Move it to the bottom (if not already there)
    if(($("#deckcounted").has($("#" + x + "div")).length == 0) && ($("#sideboardcounted").has($("#" + x + "div")).length == 0))
    {
        $("#" + x + "div").detach().appendTo("#" + source + "counted");
    }

}

function reset_qty(x, qty, source) {
    if($("#" + x + "_box").val() == qty) { return; }
    $("#" + x + "_box").val(qty);

    if(x == 0)
    {
        var next_qty_id = 1;
        while($("#" + next_qty_id + "_box").val() == "0")
        {
            next_qty_id += 1;
        }
        $("#" + x + "div").detach().insertBefore("#" + next_qty_id + "div");
    } else {
        var next_qty_id = (parseInt(x) - 1);
        while($("#" + next_qty_id + "_box").val() == "0")
        {
            next_qty_id -= 1;
        }
        $("#" + x + "div").detach().insertAfter("#" + next_qty_id + "div");
    }
}
