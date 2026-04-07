import { Layout, Container, Section } from '../components/Layout'
import '../../website/styles/website.css'

export function ContactPage() {
  return (
    <Layout>
      <Section className="bg-white">
        <Container>
          <div className="max-w-2xl mx-auto py-16">
            <h1 className="text-3xl lg:text-4xl font-serif tracking-widest text-brand uppercase mb-12 text-center">Contact Us</h1>
            
            <div className="space-y-12 animate-calm-entry">
              <div className="text-center">
                <h2 className="text-xl font-serif text-brand mb-4">Noor E Adah</h2>
                <p className="text-brand/60 leading-relaxed italic">
                  We’d love to hear from you. For any queries, collaborations, or support, feel free to reach out.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-brand/5 pt-12">
                <div className="flex flex-col items-center p-8 bg-surface-muted/30 rounded-2xl">
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand/40 mb-4 text-center">Email Support</span>
                  <a href="mailto:noor.e.adah5@gmail.com" className="text-sm font-bold text-brand hover:text-accent transition-colors">noor.e.adah5@gmail.com</a>
                </div>
                <div className="flex flex-col items-center p-8 bg-surface-muted/30 rounded-2xl">
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand/40 mb-4 text-center">Phone / WhatsApp</span>
                  <a href="tel:+919311996469" className="text-sm font-bold text-brand hover:text-accent transition-colors">+91 93119 96469</a>
                </div>
              </div>

              <div className="p-8 border border-brand/10 rounded-2xl text-center">
                <p className="text-xs text-brand/50 font-medium tracking-wide">
                  Our team typically responds within <span className="text-brand">24–48 hours</span>.
                </p>
              </div>
              
              <div className="text-center pt-8">
                <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand/30 mb-4 text-center">Official Business Address</h3>
                <p className="text-xs text-brand/60 leading-relaxed font-light">
                  [Your Full Physical Address as per GST/PAN Documents]<br />
                  [City, State, PIN]
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </Layout>
  )
}

export function TermsPage() {
  return (
    <Layout>
      <Section className="bg-white">
        <Container>
          <div className="max-w-3xl mx-auto py-16">
            <h1 className="text-3xl lg:text-4xl font-serif tracking-widest text-brand uppercase mb-12 text-center">Terms & Conditions</h1>
            <div className="prose prose-brand max-w-none text-brand/70 leading-relaxed space-y-8 animate-calm-entry font-light italic">
              <p>Welcome to Noor E Adah. By accessing or using our website, you agree to be bound by the following terms:</p>
              
              <ul className="space-y-4 list-none p-0">
                <li className="flex gap-4">
                  <span className="text-accent text-lg">•</span>
                  <span>All content on this website, including designs, images, and text, is the intellectual property of Noor E Adah and may not be used without permission.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-accent text-lg">•</span>
                  <span>Users agree not to misuse the website for any unlawful or prohibited activities.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-accent text-lg">•</span>
                  <span>Product colors may slightly vary due to screen settings and lighting.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-accent text-lg">•</span>
                  <span>We reserve the right to modify pricing, product availability, or policies at any time without prior notice.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-accent text-lg">•</span>
                  <span>These terms shall be governed in accordance with the laws of India, with jurisdiction in New Delhi, Delhi.</span>
                </li>
              </ul>
            </div>
          </div>
        </Container>
      </Section>
    </Layout>
  )
}

export function PrivacyPage() {
  return (
    <Layout>
      <Section className="bg-white">
        <Container>
          <div className="max-w-3xl mx-auto py-16 text-center">
            <h1 className="text-3xl lg:text-4xl font-serif tracking-widest text-brand uppercase mb-12 text-center">Privacy Policy</h1>
            <div className="text-brand/70 leading-relaxed space-y-8 animate-calm-entry font-light italic">
              <p>At Noor E Adah, we value your privacy and are committed to protecting your personal information.</p>
              <div className="p-8 bg-surface-muted/30 rounded-3xl border border-brand/5">
                <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-brand mb-4 text-center">Data Security Committed</h3>
                <p className="text-xs lg:text-sm">
                  We use cookies to improve your shopping experience. <span className="font-bold text-brand italic">We do not share sensitive payment information with third parties.</span> All transactions are processed through secure, encrypted payment gateways.
                </p>
              </div>
              <p className="text-xs">We collect minimal data (Name, Email, Phone, Address) strictly for order fulfillment and internal marketing purposes.</p>
            </div>
          </div>
        </Container>
      </Section>
    </Layout>
  )
}

export function ShippingPage() {
  return (
    <Layout>
      <Section className="bg-white">
        <Container>
          <div className="max-w-3xl mx-auto py-16">
            <h1 className="text-3xl lg:text-4xl font-serif tracking-widest text-brand uppercase mb-12 text-center">Shipping & Delivery</h1>
            <div className="space-y-12 animate-calm-entry">
              <div className="text-center mb-8">
                <p className="text-brand/60 leading-relaxed italic">We aim to deliver your Noor E Adah pieces with care and efficiency.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-10 bg-brand text-white rounded-[2rem] shadow-premium">
                  <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-accent mb-6">Processing Time</h3>
                  <p className="text-xl font-serif leading-relaxed">Orders are processed within <span className="text-white font-bold">2–3 business days</span>.</p>
                </div>
                <div className="p-10 bg-surface-muted text-brand rounded-[2rem] border border-brand/10">
                  <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-brand/40 mb-6">Delivery Timeline</h3>
                  <p className="text-xl font-serif leading-relaxed">Typically takes <span className="font-bold">5–10 business days</span>, depending on your location.</p>
                </div>
              </div>

              <div className="p-8 border-t border-brand/5 text-center space-y-4">
                <p className="text-xs text-brand/50 font-medium tracking-wide">You will receive tracking details via email or SMS once your order is dispatched.</p>
                <p className="text-[10px] text-brand/30 uppercase tracking-widest">Delivery timelines may vary during peak seasons or unforeseen circumstances.</p>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </Layout>
  )
}

export function RefundPage() {
  return (
    <Layout>
      <Section className="bg-white">
        <Container>
          <div className="max-w-3xl mx-auto py-16">
            <h1 className="text-3xl lg:text-4xl font-serif tracking-widest text-brand uppercase mb-12 text-center">Refund & Cancellation</h1>
            <div className="space-y-12 animate-calm-entry font-light italic">
              <div className="text-center">
                <p className="text-brand/60 leading-relaxed">We want you to love what you wear. Please review our policies regarding exchanges and cancellations.</p>
              </div>

              <div className="bg-brand/5 p-10 rounded-[2.5rem] border border-brand/10">
                <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-brand mb-6 text-center">Orders & Cancellations</h3>
                <p className="text-center text-brand text-xl font-serif">Orders once placed <span className="text-accent underline font-bold">cannot be cancelled</span>.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand/40">Exchanges</h4>
                  <p className="text-xs leading-relaxed text-brand/70">In case of defective or incorrect products, please contact us within <span className="font-bold text-brand">24 hours</span> of delivery with video/photo proof.</p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand/40">Refund Processing</h4>
                  <p className="text-xs leading-relaxed text-brand/70">Approved exchanges or credits will be processed to the original payment method within <span className="font-bold text-brand">5–7 working days</span>.</p>
                </div>
              </div>

              <div className="p-8 bg-red-50/50 rounded-2xl text-center">
                <p className="text-[10px] uppercase tracking-widest text-brand/40 font-bold">Note: Shipping charges (if any) are non-refundable.</p>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </Layout>
  )
}
