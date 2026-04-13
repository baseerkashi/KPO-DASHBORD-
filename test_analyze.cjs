const http = require('http');

const dataPayload = JSON.stringify({
  data: [{"month":"Jan","sales":15000,"expenses":20000,"workforce":null,"liabilities":0,"cash":null,"expenseBreakdown":{"balance":100000,"marketing":10000,"hosting":1000}},{"month":"Feb","sales":30000,"expenses":25000,"workforce":null,"liabilities":0,"cash":null,"expenseBreakdown":{"balance":105000,"marketing":12000,"hosting":1500}},{"month":"Mar","sales":80000,"expenses":40000,"workforce":null,"liabilities":0,"cash":null,"expenseBreakdown":{"balance":145000,"marketing":20000,"hosting":3000}},{"month":"Apr","sales":180000,"expenses":70000,"workforce":null,"liabilities":0,"cash":null,"expenseBreakdown":{"balance":255000,"marketing":40000,"hosting":5000}},{"month":"May","sales":350000,"expenses":110000,"workforce":null,"liabilities":0,"cash":null,"expenseBreakdown":{"balance":495000,"marketing":70000,"hosting":10000}}]
});

const req = http.request({
  hostname: 'localhost',
  port: 5001,
  path: '/analyze',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(dataPayload)
  }
}, res => {
  let d = '';
  res.on('data', chunk => { d += chunk; });
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', d));
});
req.write(dataPayload);
req.end();
