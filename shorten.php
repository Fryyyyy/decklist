<?php
        include_once('js/BitlyPHP/bitly.php');
        $access_token = "";
        if($_GET['deckurl']) {
            $params = array();
            $params['access_token'] = $access_token;
            $params['longUrl'] = base64_decode($_GET['deckurl']);
            $results = bitly_get('shorten', $params);
            header('Content-type: application/json');
            header('Access-Control-Allow-Origin: *');
            echo json_encode($results);
        }
?>
