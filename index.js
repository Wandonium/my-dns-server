'use strict';

let dns = require('native-dns');
let async = require('async');

let server = dns.createServer();

let authority = { address: '8.8.8.8', port: 53, type: 'udp' };

const proxy = (question, response, cb) => {
    console.log('proxying ', question.name);

    var request = dns.Request({
        question: question,     // forwarding the question
        server: authority,      // this is the DNS server we are asking
        timeout: 1000
    });

    // When we get answers, append them to the response
    request.on('message', (err, msg) => {
        msg.answer.forEach(a => response.answer.push(a));
    });

    request.on('end', cb);
    request.send();
}

const handleRequest = (req, res) => {
    console.log('request from ', req.address.address, 'for ',
        req.question[0].name);
    console.log('full request: ', req.address);
    
    let f = [];     // array of callbacks

    // proxy all questions
    // since proxying is asynchronous, store all callbacks
    req.question.forEach(question => {
        f.push(cb => proxy(question, res, cb));
    });

    // do the proxying in parallel
    // when done, respond to the request by sending the response
    async.parallel(f, () => res.send());
}

server.on('request', handleRequest);

server.on('listening', () => console.log('server listening on ', server.address()));
server.on('close', () => console.log('server closed ', server.address()));
server.on('error', (err, buff, req, res) => console.error(err.stack));
server.on('socketError', (err, socket) => console.error(err));

server.serve(53);