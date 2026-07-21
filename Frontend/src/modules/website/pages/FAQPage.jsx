import { useState } from 'react'
import { Layout, Container, Section } from '../components/Layout'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../../lib/cn'
import '../../website/styles/website.css'

const faqs = [
    {
        category: "Orders & Shipping",
        items: [
            {
                q: "How long will it take for my order to arrive?",
                a: "Orders are typically processed within 2-3 business days. Delivery generally takes 5-10 business days depending on your location within India."
            },
            {
                q: "Do you offer international shipping?",
                a: "Currently, Noor E Adah exclusively ships within India. We are looking forward to expanding our reach internationally in the near future."
            },
            {
                q: "How can I track my order?",
                a: "Once your order is dispatched, you will receive an email and SMS with a tracking link. You can also track your order directly from the 'My Account' section on our website."
            }
        ]
    },
    {
        category: "Returns & Exchanges",
        items: [
            {
                q: "What is your refund policy?",
                a: "Orders once placed cannot be cancelled. However, in the rare case that you receive a defective or incorrect product, we offer an exchange. Please reach out to us within 24 hours of delivery."
            },
            {
                q: "How do I initiate an exchange?",
                a: "To initiate an exchange for a defective item, please email our support team at noor.e.adah5@gmail.com with your Order ID and photo/video evidence of the defect within 24 hours of receiving the package."
            }
        ]
    },
    {
        category: "Products & Sizing",
        items: [
            {
                q: "How do I know which size will fit me?",
                a: "Each product page features a detailed 'Size Chart' tailored to that specific silhouette. We highly recommend measuring yourself and comparing it against our chart before purchasing."
            },
            {
                q: "Are the colors exactly as shown in the pictures?",
                a: "We strive to display colors as accurately as possible. However, slight variations may occur due to studio lighting and different monitor or mobile screen calibrations."
            },
            {
                q: "How should I care for my Noor E Adah garments?",
                a: "We recommend dry cleaning for all our exquisite pieces to maintain the integrity of the fabrics and intricate embroideries. Do not bleach or tumble dry."
            }
        ]
    }
]

export function FAQPage() {
    const [openIndex, setOpenIndex] = useState(`0-0`)

    const toggleAccordion = (index) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    return (
        <Layout>
            <Section className="bg-[#FAFAFA]">
                <Container>
                    <div className="max-w-3xl mx-auto py-20 px-4 sm:px-6">
                        <div className="text-center animate-calm-entry mb-16">
                            <span className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-accent mb-4 block">Assistance</span>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif tracking-widest text-brand uppercase mb-6">
                                Frequently Asked Questions
                            </h1>
                            <p className="text-brand/60 font-light text-sm md:text-base italic max-w-xl mx-auto">
                                Find answers to common questions about our collections, shipping, and services carefully curated for your convenience.
                            </p>
                        </div>

                        <div className="space-y-12 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                            {faqs.map((group, gIndex) => (
                                <div key={gIndex} className="space-y-6">
                                    <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-brand/50 border-b border-brand/10 pb-4">
                                        {group.category}
                                    </h2>
                                    <div className="space-y-4">
                                        {group.items.map((faq, fIndex) => {
                                            const currentIndex = `${gIndex}-${fIndex}`
                                            const isOpen = openIndex === currentIndex
                                            return (
                                                <div
                                                    key={fIndex}
                                                    className={cn(
                                                        "group border rounded-2xl overflow-hidden transition-all duration-300",
                                                        isOpen
                                                            ? "bg-white border-brand/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                                                            : "bg-transparent border-brand/5 hover:border-brand/15"
                                                    )}
                                                >
                                                    <button
                                                        onClick={() => toggleAccordion(currentIndex)}
                                                        className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                                                    >
                                                        <span className={cn(
                                                            "font-serif text-base md:text-lg pr-4 transition-colors duration-300",
                                                            isOpen ? "text-brand" : "text-brand/80 group-hover:text-brand"
                                                        )}>
                                                            {faq.q}
                                                        </span>
                                                        <div className={cn(
                                                            "flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300",
                                                            isOpen ? "border-brand bg-brand text-white rotate-180" : "border-brand/20 bg-transparent text-brand/40"
                                                        )}>
                                                            <ChevronDown className="w-4 h-4" />
                                                        </div>
                                                    </button>

                                                    <div
                                                        className={cn(
                                                            "grid transition-all duration-300 ease-in-out",
                                                            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                                        )}
                                                    >
                                                        <div className="overflow-hidden">
                                                            <p className="p-6 pt-0 text-sm md:text-base text-brand/60 font-light leading-relaxed">
                                                                {faq.a}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-20 p-10 bg-white rounded-3xl border border-brand/5 text-center shadow-premium animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                            <h3 className="text-xl font-serif text-brand mb-4">Still have questions?</h3>
                            <p className="text-sm font-light text-brand/60 mb-8 max-w-sm mx-auto">
                                Our support team is always ready to help you with anything you need.
                            </p>
                            <a
                                href="mailto:noor.e.adah5@gmail.com"
                                className="inline-block px-10 py-4 bg-brand text-white text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-[#c1a457] transition-colors duration-300"
                            >
                                Contact Us
                            </a>
                        </div>

                    </div>
                </Container>
            </Section>
        </Layout>
    )
}
