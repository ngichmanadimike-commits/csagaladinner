import { motion } from "framer-motion";

const partners = [
  { name: "Green Build Academy", url: "https://greenbuildhub.co.ke/" },
  { name: "Deco Roofing Systems", url: "https://decoroofing.co.ke/" },
  { name: "IQSK", url: "https://iqskenya.org/" },
];

const PartnersSection = () => {
  return (
    <section id="partners" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Our <span className="text-gradient">Partners</span>
          </h2>
          <p className="text-muted-foreground">Organizations supporting the future of construction</p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-8 mb-12">
          {partners.map((p, i) => (
            <motion.a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl px-8 py-6 min-w-[200px] text-center hover:border-primary/50 hover:glow-sm transition-all duration-300 group"
            >
              <p className="font-display text-lg font-bold group-hover:text-primary transition-colors">{p.name}</p>
              <p className="text-xs text-muted-foreground mt-1">Visit Website →</p>
            </motion.a>
          ))}
        </div>

        <div className="text-center">
          <a
            href="#partner-form"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg border-2 border-primary text-primary font-bold hover:bg-primary hover:text-primary-foreground transition-all duration-300"
          >
            🤝 Become a Partner
          </a>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
