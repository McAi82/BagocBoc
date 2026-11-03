<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Household Not Found</title>
    <style>
        body {
            font-family: sans-serif;
            text-align: center;
            padding: 60px 20px;
            color: #333;
            background: #f5f7fa;
        }

        .box {
            background: #fff;
            max-width: 420px;
            margin: 0 auto;
            padding: 32px;
            border-radius: 16px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }

        h1 {
            color: #F44336;
            font-size: 22px;
            margin-bottom: 12px;
        }

        p {
            color: #666;
            font-size: 14px;
            line-height: 1.6;
        }

        code {
            background: #f5f5f5;
            padding: 2px 8px;
            border-radius: 4px;
            font-family: monospace;
        }
    </style>
</head>

<body>
    <div class="box">
        <h1>❌ Household Not Found</h1>
        <p>No household matches <code>{{ $number }}</code>.</p>
        <p style="margin-top: 16px; font-size: 12px;">This QR code may be outdated or from a different barangay.</p>
    </div>
</body>

</html>