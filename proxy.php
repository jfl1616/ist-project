<?php
// Turn ON error reporting for debugging (turn off in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Base API URL
define('HOSTNAME', 'http://www.ist.rit.edu/api');

// Get path from query string
$path = $_GET['path'] ?? '';
if (!$path) {
    header('Content-Type: application/json');
    die(json_encode(['error' => 'Missing "path" parameter']));
}

$url = HOSTNAME . $path;

// Log the exact URL being requested
error_log("proxy.php: Fetching URL = $url");

// Initialize cURL
$ch = curl_init($url);

if ($ch === false) {
    error_log("proxy.php: curl_init failed");
    header('Content-Type: application/json');
    die(json_encode(['error' => 'cURL initialization failed']));
}

// Set options
curl_setopt($ch, CURLOPT_HEADER, false);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);

// Critical: Add User-Agent (many APIs block default PHP cURL)
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

// Optional: Disable SSL verification temporarily for debugging (REMOVE in production!)
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

// Execute
$result = curl_exec($ch);

if ($result === false) {
    $curlError = curl_error($ch);
    error_log("proxy.php: cURL error: $curlError");
    curl_close($ch);
    header('Content-Type: application/json');
    die(json_encode(['error' => 'cURL request failed', 'curl_error' => $curlError]));
}

curl_close($ch);

// Output as JSON
header('Content-Type: application/json');
echo $result;
?>