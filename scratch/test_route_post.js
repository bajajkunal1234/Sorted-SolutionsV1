const { POST } = require('../app/api/technician/jobs/[id]/interactions/route.js');

async function runTest() {
  const mockRequest = {
    json: async () => ({
      type: 'before-photos-uploaded',
      category: 'job',
      description: 'Before Photos uploaded.',
      user_name: 'Test Technician',
      metadata: { attachments: ['https://example.com/test.jpg'] }
    })
  };

  const mockParams = {
    params: { id: 'd4834205-69fb-4426-a110-80e8ecea3807' }
  };

  try {
    const response = await POST(mockRequest, mockParams);
    const json = await response.json();
    console.log("Response Status:", response.status);
    console.log("Response JSON:", json);
  } catch (err) {
    console.error("Error running POST handler:", err);
  }
}

runTest();
