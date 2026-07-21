import { Layout, Container, Section } from '../components/Layout'
import '../../website/styles/website.css'

export function AboutPage() {
    return (
        <Layout>
            <Section className="bg-white overflow-hidden relative">
                {/* Abstract decorative background elements */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl -z-10 translate-y-1/3 -translate-x-1/4"></div>

                <Container>
                    <div className="max-w-4xl mx-auto py-24 px-4 sm:px-6 lg:px-8">
                        <div className="text-center animate-calm-entry mb-20">
                            <span className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-accent mb-6 block">Our Heritage</span>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif tracking-wide text-brand uppercase leading-tight mb-8">
                                The Story of<br />Noor E Adah
                            </h1>
                            <div className="w-16 h-[1px] bg-brand/20 mx-auto"></div>
                        </div>

                        <div className="space-y-20">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                                <div className="aspect-[4/5] bg-surface-muted/50 rounded-bl-[4rem] rounded-tr-[4rem] overflow-hidden shadow-sm relative group p-2">
                                    <div className="w-full h-full bg-brand/5 rounded-bl-[3.5rem] rounded-tr-[3.5rem] p-4 flex items-center justify-center text-brand/20 font-serif italic text-xl border border-brand/10">
                                        <img src="https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80" alt="Exquisite Details" className="w-full h-full object-cover rounded-bl-[3rem] rounded-tr-[3rem] opacity-90 transition-transform duration-700 group-hover:scale-105" />
                                    </div>
                                </div>
                                <div className="space-y-6 text-center md:text-left">
                                    <h2 className="text-2xl lg:text-3xl font-serif text-brand italic">A Celebration of Grace</h2>
                                    <p className="text-brand/70 leading-relaxed font-light text-sm md:text-base">
                                        Noor E Adah is more than just a label—it is a poetic celebration of grace, elegance, and individuality. We believe that true fashion does not overpower; it enhances the radiant beauty that already exists within you.
                                    </p>
                                    <p className="text-brand/70 leading-relaxed font-light text-sm md:text-base">
                                        Every silhouette we design, every thread we weave, is thoughtfully considered to bring out your inner radiance. Where every detail speaks of timeless style, effortless charm, and understated luxury.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center md:flex-row-reverse animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                                <div className="order-1 md:order-2 aspect-[4/5] bg-surface-muted/50 rounded-tl-[4rem] rounded-br-[4rem] overflow-hidden shadow-sm relative group p-2">
                                    <div className="w-full h-full bg-accent/10 rounded-tl-[3.5rem] rounded-br-[3.5rem] flex items-center justify-center border border-accent/20 overflow-hidden">
                                        <img src="https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=800&q=80" alt="Exquisite Details" className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105" />
                                    </div>
                                </div>
                                <div className="order-2 md:order-1 space-y-6 text-center md:text-right">
                                    <h2 className="text-2xl lg:text-3xl font-serif text-brand italic">Craftsmanship & Dedication</h2>
                                    <p className="text-brand/70 leading-relaxed font-light text-sm md:text-base">
                                        Our journey began with a simple vision: to create exquisite pieces that stand the test of time. We meticulously source the finest fabrics and collaborate with master artisans who pour their heritage and passion into every stitch.
                                    </p>
                                    <p className="text-brand/70 leading-relaxed font-light text-sm md:text-base">
                                        We invite you to experience the harmony of tradition and contemporary aesthetics, carefully curated to make you feel as beautiful on the outside as you are on the inside.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-32 text-center animate-fade-in-up border-t border-brand/10 pt-16" style={{ animationDelay: '600ms' }}>
                            <p className="text-xl md:text-2xl font-serif italic text-brand max-w-2xl mx-auto leading-relaxed">
                                "Fashion is an art of personal storytelling. Noor E Adah is the language in which you write your most elegant chapters."
                            </p>
                            <div className="mt-8 flex justify-center">
                                <span className="text-[10px] uppercase tracking-[0.4em] text-brand/40 font-bold">— Welcome to our world</span>
                            </div>
                        </div>

                    </div>
                </Container>
            </Section>
        </Layout>
    )
}
