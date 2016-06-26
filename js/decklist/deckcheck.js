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

    if($._GET['deckmain'] != undefined) {
        var cards = $._GET['deckmain'].split("\n");

        for(i = 0; i < cards.length; i++)
        {
            if(cards[i] != "") {
                card_split = proper_split(cards[i], " ", 1);
                card_qty = card_split[0];
                card_name = card_split[1];

                div_starter = "<div id='" + i + "div'>";
                qty_textbox = "<input type='text' name='" + i + "_box' id='" + i + "_box' value='" + card_qty + "' disabled size='3'>";
                minusone_textbox = "<input type='button' name='" + i + "_minusone' id='" + i + "_minusone' value='-1' onclick='minusOne(" + i + ");'>";
                if(card_qty != "1") {
                    minusall_textbox = "<input type='button' name='" + i + "_minusall' id ='" + i + "_minusall' value='-" + card_qty + "' onclick='minusAll(" + i + ");'>";
                } else {
                    minusall_textbox = "";
                }
                div_ender = card_name + "</div>";

                $("#deck").append(div_starter + qty_textbox + minusone_textbox + minusall_textbox + div_ender);
            }
        }
    }
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
