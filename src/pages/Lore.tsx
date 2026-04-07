import { motion } from 'motion/react';

const CHAPTERS: any[] = [];

export function Lore() {
  return (
    <div className="w-full pt-32 px-6 pb-32 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, clipPath: 'inset(100% 0 0 0)' }}
        animate={{ opacity: 1, clipPath: 'inset(0% 0 0 0)' }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="mb-24 text-center"
      >
        <h1 className="text-5xl md:text-7xl mb-6">Cosmogonia de Kyvra</h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="font-sc text-sm tracking-[0.3em] text-primary"
        >
          A HISTÓRIA DOS FRAGMENTOS
        </motion.p>
      </motion.div>

      <div className="relative">
        {/* Timeline Line (Desktop) */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[1px] bg-gradient-to-b from-primary to-secondary shadow-[0_0_8px_var(--primary)] -translate-x-1/2" />

        <div className="flex flex-col gap-24">
          {CHAPTERS.map((chapter, index) => {
            const isEven = index % 2 === 0;
            return (
              <motion.div 
                key={chapter.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className={`relative flex flex-col md:flex-row gap-8 md:gap-16 ${isEven ? 'md:flex-row-reverse' : ''}`}
              >
                {/* Timeline Node */}
                <div className="hidden md:block absolute left-1/2 top-8 w-3 h-3 rounded-full border border-primary bg-void shadow-[0_0_10px_var(--primary)] -translate-x-1/2 z-10" />

                {/* Content */}
                <div className={`flex-1 ${isEven ? 'md:text-right' : 'md:text-left'}`}>
                  <span className="font-sc text-[11px] tracking-[0.2em] text-primary mb-2 block">
                    {chapter.year}
                  </span>
                  <h2 className="text-3xl md:text-4xl mb-6">{chapter.title}</h2>
                  <div className="prose prose-invert max-w-none">
                    <p className="font-sans font-light text-[17px] leading-[1.9] text-text-mid mb-8">
                      {chapter.content}
                    </p>
                    <blockquote className={`border-l-2 border-primary pl-6 py-2 ${isEven ? 'md:border-l-0 md:border-r-2 md:pl-0 md:pr-6' : ''}`}>
                      <p className="font-display italic text-2xl text-text-high">
                        "{chapter.quote}"
                      </p>
                    </blockquote>
                  </div>
                </div>
                
                {/* Empty space for the other side of the timeline */}
                <div className="hidden md:block flex-1" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
