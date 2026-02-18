import { fetchAppContent } from '@/lib/fetchAppContent';
import ContactForm from '@/components/contact/ContactForm';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export const metadata = {
    title: 'Contact Us | Sorted Solutions',
    description: 'Get in touch with Sorted Solutions for appliance repair and maintenance services.',
};

export default async function ContactPage() {
    const content = await fetchAppContent('static-pages-content');
    const contact = content?.contact;

    if (!contact || !contact.published) {
        return (
            <div className="container mx-auto px-4 py-12 text-center">
                <h1 className="text-2xl font-bold mb-4">Contact Us</h1>
                <p>This content is currently unavailable.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl">
            <h1 className="text-4xl font-bold text-center mb-4">Contact Us</h1>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
                We're here to help! Reach out to us for any service inquiries, support requests, or partnership opportunities.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Contact Information */}
                <div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
                        <div className="prose prose-lg dark:prose-invert mb-8" dangerouslySetInnerHTML={{ __html: contact.content }} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                            <div className="flex gap-4">
                                <div className="mt-1">
                                    <MapPin className="text-blue-600" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Visit Us</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{contact.contactInfo.headOffice}</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="mt-1">
                                    <Phone className="text-blue-600" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Call Us</h3>
                                    {contact.contactInfo.phones.map((phone, idx) => (
                                        <p key={idx} className="text-sm text-gray-600 dark:text-gray-400">{phone}</p>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="mt-1">
                                    <Mail className="text-blue-600" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Email Us</h3>
                                    {contact.contactInfo.emails.map((email, idx) => (
                                        <p key={idx} className="text-sm text-gray-600 dark:text-gray-400">{email}</p>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="mt-1">
                                    <Clock className="text-blue-600" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Business Hours</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{contact.contactInfo.businessHours}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Map */}
                    {contact.mapSettings?.embedUrl && (
                        <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 h-[300px]">
                            <iframe
                                src={contact.mapSettings.embedUrl}
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                        </div>
                    )}
                </div>

                {/* Contact Form */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-8 border border-gray-100 dark:border-gray-700">
                    <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
                    {contact.formSettings.enabled ? (
                        <ContactForm settings={contact.formSettings} />
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <p>Contact form is currently disabled. Please use email or phone to reach us.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
