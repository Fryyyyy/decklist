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
                minusone_textbox = "<input type='button' name='" + j + "_minusone' id='" + j + "_minusone' value='-1' onclick='minusOne(" + j + ");'>";
                if(card_qty != "1") {
                    minusall_textbox = "<input type='button' name='" + j + "_minusall' id ='" + j + "_minusall' value='-" + card_qty + "' onclick='minusAll(" + j+ ");'>";
                } else {
                    minusall_textbox = "";
                }
                div_ender = card_name + "</div>";

                $("#deck").append(div_starter + qty_textbox + minusone_textbox + minusall_textbox + div_ender);

                $("#" + j + "div").keyup(function(event) {
                    var div_id = event.target.id.split("div")[0];
                    if(event.keyCode == 49) {
                        minusOne(div_id);
                    } else if(event.keyCode == 50) {
                        minusAll(div_id);
                        $("#" + (parseInt(div_id) + 1) + "div").focus();
                    }
                });
                j++;
            }
        }
    }
    if($._GET['deckside'] != undefined) {
        var cards = $._GET['deckside'].split("\n");

        for(i = 0; i < cards.length; i++ && j++)
        {
            if(cards[i] != "") {
                card_split = proper_split(cards[i], " ", 1);
                card_qty = card_split[0];
                card_name = card_split[1];

                div_starter = "<div id='" + j+ "div' tabindex='1'>";
                qty_textbox = "<input type='text' name='" + j + "_box' id='" + j + "_box' value='" + card_qty + "' disabled size='3'>";
                minusone_textbox = "<input type='button' name='" + j + "_minusone' id='" + j + "_minusone' value='-1' onclick='minusOne(" + j + ");'>";
                if(card_qty != "1") {
                    minusall_textbox = "<input type='button' name='" + j + "_minusall' id ='" + j + "_minusall' value='-" + card_qty + "' onclick='minusAll(" + j + ");'>";
                } else {
                    minusall_textbox = "";
                }
                div_ender = card_name + "</div>";

                $("#sideboard").append(div_starter + qty_textbox + minusone_textbox + minusall_textbox + div_ender);
            }
        }
    }

    // Focus on first line
    $("#0div").focus();
}

function minusOne(x) {
    var value = (parseInt($("#" + x + "_box").val(), 10));
    $("#" + x + "_box").val((value - 1) < 0 ? 0 : (value - 1));

    // If no cards left, move to the bottom
    if($("#" + x + "_box").val() == "0") {
        $("#" + x + "div").detach().appendTo("#deckcounted");
    }
}

function minusAll(x) {
    $("#" + x + "_box").val(0);
    $("#" + x + "div").detach().appendTo("#deckcounted");

}
