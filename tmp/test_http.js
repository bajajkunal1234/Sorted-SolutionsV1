async function testHttp() {
    console.log("Fetching from Live API...");
    const url = "https://sortedsolutions.in/api/customer/jobs?customerId=2d89982f-e80b-4f55-b33a-0ab2f7df5f4d&status=all";
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(`Status: ${response.status}`);
        console.log(`Job count: ${data.count}`);
        
        if (data.jobs && data.jobs.length > 0) {
            console.log("Job data excerpt:", data.jobs[0]);
        } else {
            console.log("Full response data:", data);
        }
    } catch (err) {
        console.error("Fetch failed:", err);
    }
}
testHttp();
