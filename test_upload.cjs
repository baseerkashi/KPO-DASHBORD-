const http = require('http');
const fs = require('fs');

const file = fs.readFileSync('data/sample-var-15-edtech-boom.csv');
const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const head = '--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="sample.csv"\r\nContent-Type: text/csv\r\n\r\n';
const tail = '\r\n--' + boundary + '--\r\n';

const postData = Buffer.concat([Buffer.from(head, 'utf8'), file, Buffer.from(tail, 'utf8')]);

const req = http.request({
  hostname: 'localhost',
  port: 5001,
  path: '/upload',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': postData.length
  }
}, res => {
  let d = '';
  res.on('data', chunk => { d += chunk; });
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', d));
});
req.write(postData);
req.end();
