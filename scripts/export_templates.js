const XLSX = require('xlsx');

const templates = [
  { Event: 'Job Created (Admin)', Target: 'Customer', Template: 'Booking Confirmation', Variables: 'customer_name, job_id', Message: "Hi {customer_name}, your booking request has been received! Your Job Reference is #{job_id}. We will assign a technician shortly and keep you updated. View booking: https://sortedsolutions.in/customer/bookings/{job_id}" },
  { Event: 'Job Created (Admin)', Target: 'Admin', Template: 'Job Notification', Variables: 'job_id, customer_name', Message: "🚨 New Job Alert! A new booking (Job #{job_id}) has been created for {customer_name}. Please assign a technician: https://sortedsolutions.in/admin" },
  { Event: 'Job Assigned', Target: 'Customer', Template: 'Job Notification', Variables: 'customer_name, technician_name, job_id', Message: "Hi {customer_name}, great news! {technician_name} has been assigned to your service request (Job #{job_id}). They will arrive at the scheduled time. View details: https://sortedsolutions.in/customer/bookings/{job_id}" },
  { Event: 'Job Assigned', Target: 'Technician', Template: 'Job Notification', Variables: 'technician_name, job_id, customer_name', Message: "🔧 New Assignment! Hi {technician_name}, you've been assigned Job #{job_id} for {customer_name}. Please check your Technician App for details and location: https://sortedsolutions.in/technician/dashboard" },
  { Event: 'Job Started', Target: 'Customer', Template: 'Job Notification', Variables: 'customer_name, technician_name, job_id', Message: "Hi {customer_name}, {technician_name} is starting work on your Job #{job_id} now. You can track their real-time location in your Customer Portal! 📍 https://sortedsolutions.in/customer/bookings/{job_id}" },
  { Event: 'Job Started', Target: 'Admin', Template: 'Job Notification', Variables: 'technician_name, job_id, customer_name', Message: "{technician_name} has started work on Job #{job_id} for {customer_name}." },
  { Event: 'Job Completed', Target: 'Customer', Template: 'Job Completion', Variables: 'customer_name, job_id', Message: "Hi {customer_name}, your Job #{job_id} is now complete! ✅ Thank you for choosing Sorted Solutions. We'd love to hear your feedback! View invoice: https://sortedsolutions.in/customer/bookings/{job_id}" },
  { Event: 'Job Completed', Target: 'Technician', Template: 'Job Completion', Variables: 'technician_name, job_id', Message: "Fantastic work {technician_name}! Job #{job_id} has been marked as completed successfully. 🎉" },
  { Event: 'Job Completed', Target: 'Admin', Template: 'Job Completion', Variables: 'technician_name, job_id, customer_name', Message: "✅ Job Completed: {technician_name} has finished Job #{job_id} for {customer_name}." },
  { Event: 'Job Cancelled', Target: 'Customer', Template: 'Job Notification', Variables: 'customer_name, job_id', Message: "Hi {customer_name}, we're writing to confirm that your Job #{job_id} has been successfully cancelled. Need to rebook? Visit the app: https://sortedsolutions.in/customer/dashboard" },
  { Event: 'Job Cancelled', Target: 'Technician', Template: 'Job Notification', Variables: 'job_id, customer_name', Message: "⚠️ Alert: Job #{job_id} for {customer_name} has been cancelled. Please do not proceed to the location." },
  { Event: 'Job Cancelled', Target: 'Admin', Template: 'Job Notification', Variables: 'job_id, customer_name', Message: "❌ Job Cancelled: Job #{job_id} for {customer_name} was just cancelled." },
  { Event: 'Quotation Sent', Target: 'Customer', Template: 'Quotation Message', Variables: 'customer_name, job_id', Message: "Hi {customer_name}, we've generated a quotation for your Job #{job_id}. You can view and accept it directly through your Customer Portal: https://sortedsolutions.in/customer/bookings/{job_id}" },
  { Event: 'Sales Invoice Created', Target: 'Customer', Template: 'General Announcement', Variables: 'customer_name, job_id', Message: "Hi {customer_name}, a new invoice has been generated for Job #{job_id}. You can view, download, and pay it in your Customer Portal: https://sortedsolutions.in/customer/bookings/{job_id}" },
  { Event: 'New Customer', Target: 'Customer', Template: 'General Announcement', Variables: 'customer_name', Message: "Hi {customer_name}, welcome to Sorted Solutions! 🎉 We're thrilled to have you. Book your first service easily today: https://sortedsolutions.in/customer/dashboard" },
  { Event: 'New Customer', Target: 'Admin', Template: 'General Announcement', Variables: 'customer_name', Message: "👤 New Sign-Up: {customer_name} has just registered a new customer account!" },
  { Event: 'Rental Created', Target: 'Customer', Template: 'Booking Confirmation', Variables: 'customer_name', Message: "Hi {customer_name}, your new rental contract has been set up successfully. Welcome to hassle-free appliance rentals! View details: https://sortedsolutions.in/customer/rentals" },
  { Event: 'Rent Due Reminder', Target: 'Customer', Template: 'Payment Reminder', Variables: 'customer_name', Message: "Hi {customer_name}, this is a friendly reminder that your upcoming rental payment is due soon. Please clear your dues in the app to avoid late fees: https://sortedsolutions.in/customer/rentals" },
  { Event: 'Rental Expiring', Target: 'Customer', Template: 'General Announcement', Variables: 'customer_name', Message: "Hi {customer_name}, your rental contract is expiring in 30 days! Please review your options in the app to renew or schedule a pickup: https://sortedsolutions.in/customer/rentals" }
];

const worksheet = XLSX.utils.json_to_sheet(templates);
// Auto-size columns slightly
var wscols = [
  { wch: 25 },
  { wch: 15 },
  { wch: 25 },
  { wch: 35 },
  { wch: 150 }
];
worksheet['!cols'] = wscols;

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Templates');

const filePath = 'c:\\Users\\KIIT\\.gemini\\antigravity\\brain\\4d9a7c30-a66f-4a19-b993-d2862505719b\\artifacts\\notification_templates.xlsx';
XLSX.writeFile(workbook, filePath);
console.log('Saved to ' + filePath);
