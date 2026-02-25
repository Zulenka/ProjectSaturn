const { parseWebDavDirectoryListing } = require('@/common/webdav-xml');

test('parseWebDavDirectoryListing returns only userscript files', () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
  <d:multistatus xmlns:d="DAV:">
    <d:response>
      <d:href>/violentmonkey/</d:href>
      <d:propstat>
        <d:prop>
          <d:resourcetype><d:collection/></d:resourcetype>
        </d:prop>
      </d:propstat>
    </d:response>
    <d:response>
      <d:href>/violentmonkey/vm%402-script-a</d:href>
      <d:propstat>
        <d:prop>
          <d:displayname>vm@2-script-a</d:displayname>
          <d:resourcetype/>
          <d:getcontentlength>123</d:getcontentlength>
        </d:prop>
      </d:propstat>
    </d:response>
    <d:response>
      <d:href>/violentmonkey/readme.txt</d:href>
      <d:propstat>
        <d:prop>
          <d:displayname>readme.txt</d:displayname>
          <d:resourcetype/>
          <d:getcontentlength>15</d:getcontentlength>
        </d:prop>
      </d:propstat>
    </d:response>
  </d:multistatus>`;
  const entries = parseWebDavDirectoryListing(xml, name => /^vm(?:@\d+)?-/.test(name));
  expect(entries).toEqual([{
    name: 'vm@2-script-a',
    size: 123,
  }]);
});
