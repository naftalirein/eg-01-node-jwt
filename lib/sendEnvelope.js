// sendEnvelope.js
/**
 * @file sendEnvelope
 * sendEnvelope file sends an envelope to a remote signer. 
 * A remote signer receives an invitation to the signing ceremony via
 * an email sent by DocuSign
 * @author DocuSign
 */

'use strict';

let   path = require('path')
    , docusign = require('docusign-esign')
    , moment = require('moment')
    , fs = require('fs-extra')
    , demo_doc_path = path.join(__dirname, '..', '..', 'demo_documents')
    , doc_2_docx = 'World_Wide_Corp_Battle_Plan_Trafalgar.docx'
    , doc_3_pdf  = 'World_Wide_Corp_lorem.pdf';
    ;

// Exporting the sendEnvelope namespace. See https://team.goodeggs.com/export-sendEnvelope-interface-design-patterns-for-node-js-modules-b48a3b1f8f40#34e6

var sendEnvelope = exports;

/**
  * Creates and sends an envelope to a remote signer
  * <br>The envelope includes three documents, a signer, and a cc recipient.
  * <br>Document 1: An HTML document.
  * <br>Document 2: A Word .docx document.
  * <br>Document 3: A PDF document.
  * <br>DocuSign will convert all of the documents to the PDF format.
  * <br>The recipients' field tags are placed using <b>anchor</b> strings.
  * <br><b>SIDE EFFECTS</b>: The function checks the token and causes a new one to be created if need be
  * @function
  * @param {object} args parameters for the envelope:
  * <br>{<tt>ds_jwt_auth:</tt> Instance of the DS_JWT_Auth class with authentication information,
  * <br>{<tt>signer_email:</tt> Signer's email,
  * <br><tt>signer_name:</tt> Signer's name,
  * <br><tt>cc_email:</tt> Carbon copy recipient's email,
  * <br><tt>cc_name:</tt> Carbon copy recipient's name}
  * <br><tt>app_dir:</tt> Carbon copy recipient's name}
  * @returns {promise} Results of the send operation:
  * <br>{<tt>status:</tt> The envelope's status. Usually <b>sent</b>.
  * <br><tt>envelopeId:</tt> The envelope ID}
  */
sendEnvelope.sendEnvelope = async function _sendEnvelope(args){
  let env = sendEnvelope._create_envelope_1(args);
  await args.ds_jwt_auth.check_token();
  let envelopesApi = new docusign.EnvelopesApi(args.ds_jwt_auth.get_ds_api())
    , create_envelope_p = args.ds_jwt_auth.make_promise(envelopesApi, 'createEnvelope')
    , results = await create_envelope_p(
      args.ds_jwt_auth.get_account_id(), {envelopeDefinition: env});
  return results
}

/**
 * Creates envelope_1
 * @function create_envelope_1
 * @param {Object} args parameters for the envelope:
 *   <tt>signer_email</tt>, <tt>signer_name</tt>, <tt>cc_email</tt>, <tt>cc_name</tt>
 * @returns {Envelope} An envelope definition
 * @private
 */
sendEnvelope._create_envelope_1 = function __create_envelope_1(args){
  // document 1 (html) has tag **signature_1**
  // document 2 (docx) has tag /sn1/
  // document 3 (pdf) has tag /sn1/
  //
  // The envelope has two recipients.
  // recipient 1 - signer
  // recipient 2 - cc
  // The envelope will be sent first to the signer.
  // After it is signed, a copy is sent to the cc person.

  let doc_2_docx_bytes, doc_3_pdf_bytes;
  // read files from a local directory
  // The reads could raise an exception if the file is not available!
  doc_2_docx_bytes =
    fs.readFileSync(path.resolve(demo_doc_path, doc_2_docx));
  doc_3_pdf_bytes =
    fs.readFileSync(path.resolve(demo_doc_path, doc_3_pdf));

  // create the envelope definition
  let env = new docusign.EnvelopeDefinition();
  env.emailSubject = 'Please sign this document set sent from Node SDK';

  // add the documents
  let doc_1 = new docusign.Document()
    , doc_2 = new docusign.Document()
    , doc_3 = new docusign.Document()
    , doc_1_b64 = Buffer.from(sendEnvelope._envelope_1_document_1(args)).toString('base64')
    , doc_2_b64 = Buffer.from(doc_2_docx_bytes).toString('base64')
    , doc_3_b64 = Buffer.from(doc_3_pdf_bytes).toString('base64')
    ;

  doc_1.documentBase64 = doc_1_b64;
  doc_1.name = 'Order acknowledgement'; // can be different from actual file name
  doc_1.fileExtension = 'html'; // Source data format. Signed docs are always pdf.
  doc_1.documentId = '1'; // a label used to reference the doc
  doc_2.documentBase64 = doc_2_b64;
  doc_2.name = 'Battle Plan'; // can be different from actual file name
  doc_2.fileExtension = 'docx';
  doc_2.documentId = '2';
  doc_3.documentBase64 = doc_3_b64;
  doc_3.name = 'Lorem Ipsum'; // can be different from actual file name
  doc_3.fileExtension = 'pdf';
  doc_3.documentId = '3';

  // The order in the docs array determines the order in the envelope
  env.documents = [doc_1, doc_2, doc_3];

  // create a signer recipient to sign the document, identified by name and email
  // We're setting the parameters via the object creation
  let signer_1 = docusign.Signer.constructFromObject({email: args.signer_email,
    name: args.signer_name, recipientId: '1', routingOrder: '1'});
  // routingOrder (lower means earlier) determines the order of deliveries
  // to the recipients. Parallel routing order is supported by using the
  // same integer as the order for two or more recipients.

  // create a cc recipient to receive a copy of the documents, identified by name and email
  // We're setting the parameters via setters
  let cc_1 = new docusign.CarbonCopy();
  cc_1.email = args.cc_email;
  cc_1.name = args.cc_name;
  cc_1.routingOrder = '2';
  cc_1.recipientId = '2';

  // Create signHere fields (also known as tabs) on the documents,
  // We're using anchor (autoPlace) positioning
  //
  // The DocuSign platform seaches throughout your envelope's
  // documents for matching anchor strings. So the
  // sign_here_2 tab will be used in both document 2 and 3 since they
  // use the same anchor string for their "signer 1" tabs.
  let sign_here_1 = docusign.SignHere.constructFromObject({
        anchorString: '**signature_1**',
        anchorYOffset: '10', anchorUnits: 'pixels',
        anchorXOffset: '20'})
    , sign_here_2 = docusign.SignHere.constructFromObject({
        anchorString: '/sn1/',
        anchorYOffset: '10', anchorUnits: 'pixels',
        anchorXOffset: '20'})
    ;

  // Tabs are set per recipient / signer
  let signer_1_tabs = docusign.Tabs.constructFromObject({
    signHereTabs: [sign_here_1, sign_here_2]});
  signer_1.tabs = signer_1_tabs;

  // Add the recipients to the envelope object
  let recipients = docusign.Recipients.constructFromObject({
    signers: [signer_1],
    carbonCopies: [cc_1]});
  env.recipients = recipients;

  // Request that the envelope be sent by setting |status| to "sent".
  // To request that the envelope be created as a draft, set to "created"
  env.status = 'sent';

  return env;
}

/**
 * Creates document 1 for  envelope_1
 * @function
 * @private
 * @param {Object} args parameters for the envelope:
 *   <tt>signer_email</tt>, <tt>signer_name</tt>, <tt>cc_email</tt>, <tt>cc_name</tt>
 * <br><b>SIDE EFFECTS</b>: The function checks the token and causes a new one to be created if need be
 * @returns {string} A document in HTML format
 */

sendEnvelope._envelope_1_document_1 = function __envelope_1_document_1(args) {
  return `
  <!DOCTYPE html>
  <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family:sans-serif;margin-left:2em;">
      <h1 style="font-family: 'Trebuchet MS', Helvetica, sans-serif;
          color: darkblue;margin-bottom: 0;">World Wide Corp</h1>
      <h2 style="font-family: 'Trebuchet MS', Helvetica, sans-serif;
        margin-top: 0px;margin-bottom: 3.5em;font-size: 1em;
        color: darkblue;">Order Processing Division</h2>
      <h4>Ordered by ${args.signer_name}</h4>
      <p style="margin-top:0em; margin-bottom:0em;">Email: ${args.signer_email}</p>
      <p style="margin-top:0em; margin-bottom:0em;">Copy to: ${args.cc_name}, ${args.cc_email}</p>
      <p style="margin-top:3em;">
Candy bonbon pastry jujubes lollipop wafer biscuit biscuit. Topping brownie sesame snaps sweet roll pie. Croissant danish biscuit soufflé caramels jujubes jelly. Dragée danish caramels lemon drops dragée. Gummi bears cupcake biscuit tiramisu sugar plum pastry. Dragée gummies applicake pudding liquorice. Donut jujubes oat cake jelly-o. Dessert bear claw chocolate cake gummies lollipop sugar plum ice cream gummies cheesecake.
      </p>
      <!-- Note the anchor tag for the signature field is in white. -->
      <h3 style="margin-top:3em;">Agreed: <span style="color:white;">**signature_1**/</span></h3>
      </body>
  </html>
`
}
