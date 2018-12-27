// See https://mochajs.org/

const chai = require('chai')
    , expect = chai.expect
    , should = chai.should()
    , DS_JWT_Auth = require('../lib/dsJwtAuth.js')
    , SendEnvelope = require('../lib/sendEnvelope')
    , ListEnvelopes = require('../lib/listEnvelopes')
    , dsConfig = require('../dsConfig.js').config
    ;

describe ('eg-01-Node-JWT (First test takes 15 seconds.)', function(){

    let dsJwtAuth = new DS_JWT_Auth(true);

    if (! dsConfig.clientId) {
        console.log (`\nProblem: you need to configure this example,
        either via environment variables (recommended) or via the ds_config.js
        file. See the README file for more information\n\n`);
        process.exit();
    }
  
    it('#send_envelope_1 should work', async function(){
        this.timeout(30000); // 30 sec allows for the accessToken to be acquired and the envelope to be created

        try {
            let sendEnvelope = new SendEnvelope(dsJwtAuth)
            , envelopeArgs = {
                signerEmail: dsConfig.signerEmail,
                signerName: dsConfig.signerName,
                ccEmail: dsConfig.ccEmail,
                ccName: dsConfig.ccName
              }
            , results = await sendEnvelope.sendEnvelope1(envelopeArgs);
        
            let worked = results.status === "sent" &&
                    results.envelopeId.length > 10;
            expect(worked).to.equal(true);
        } catch (e) {
            // This catch statement provides more info on an API problem.
            // To debug mocha:
            // npm test -- --inspect --debug-brk
            let body = e.response && e.response.body;
            if (body) {
            // DocuSign API problem
            console.log (`\nAPI problem: Status code ${e.response.status}, message body:
        ${JSON.stringify(body, null, 4)}\n\n`);
            } else {
            // Not an API problem
            throw e;
            }
        }
    });

    it('#list_envelopes should work', async function(){
        this.timeout(30000); // 30 sec allows for the accessToken to be acquired and the envelope to be created

        try {
            let listEnvelopes = new ListEnvelopes(dsJwtAuth)
              , results = await listEnvelopes.listEnvelopes1();
            
            let worked = Array.isArray(results.envelopes);
            expect(worked).to.equal(true);
        } catch (e) {
            // This catch statement provides more info on an API problem.
            // To debug mocha:
            // npm test -- --inspect --debug-brk
            let body = e.response && e.response.body;
            if (body) {
            // DocuSign API problem
            console.log (`\nAPI problem: Status code ${e.response.status}, message body:
    ${JSON.stringify(body, null, 4)}\n\n`);
            } else {
            // Not an API problem
            throw e;
            }
        }
    })
})
