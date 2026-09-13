import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Database, Cpu, Users } from "lucide-react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";

const Card = ({ icon: Icon, title, desc }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    style={{
      backgroundColor: 'rgba(18, 18, 18, 0.4)',
      backdropFilter: 'blur(15px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '16px',
      padding: '32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
    }}
  >
    <div style={{ padding: '12px', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', width: 'fit-content', boxShadow: '0 0 15px rgba(99,102,241,0.2)' }}>
      <Icon size={32} color="#6366F1" />
    </div>
    <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>{title}</h3>
    <p style={{ fontSize: '15px', color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>{desc}</p>
  </motion.div>
);

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const LandingPage = ({ theme }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#F8FAFC',
      fontFamily: 'Lexend, sans-serif',
      overflowX: 'hidden'
    }}>
      {/* Hero Section */}
      <AuroraBackground className="!bg-[#000000] !h-screen">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          style={{ position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto', padding: '0 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', marginTop: '64px' }}
        >
          <motion.div variants={itemVariants}>
            <AnimatedGradientText className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md cursor-pointer hover:bg-white/10 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.05)] text-sm">
              ✨ Aapda Setu Prototype v1.0 <ChevronRight className="inline ml-1 size-4" />
            </AnimatedGradientText>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            style={{
              fontSize: 'clamp(40px, 6vw, 72px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              margin: 0,
              textShadow: '0 0 40px rgba(99, 102, 241, 0.3)'
            }}
          >
            Real-time operations for <br />
            <span style={{ 
              background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 20px rgba(99,102,241,0.4)'
            }}>
              disaster response.
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            style={{
              fontSize: '18px',
              color: '#94A3B8',
              maxWidth: '600px',
              lineHeight: 1.6,
              margin: 0
            }}
          >
            A serious, trustworthy technical platform for optimizing shelter assignments, routing, and real-time hazard response using CP-SAT and machine learning.
          </motion.p>

          <motion.div variants={itemVariants} style={{ marginTop: '16px' }}>
            <Link to="/dashboard" style={{ textDecoration: 'none' }}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ShimmerButton 
                  className="shadow-2xl hover:shadow-[0_0_30px_rgba(99,102,241,0.8)] transition-shadow duration-300"
                  background="rgba(99, 102, 241, 0.8)"
                  shimmerColor="#ffffff"
                  shimmerSize="0.1em"
                >
                  <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg flex items-center gap-2">
                    Enter Dashboard <ChevronRight size={18} />
                  </span>
                </ShimmerButton>
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>
      </AuroraBackground>

      {/* The Core Problem */}
      <section style={{ padding: '120px 24px', maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto', marginBottom: '80px' }}
        >
          <h2 style={{ fontSize: '36px', fontWeight: 700, color: '#F8FAFC', marginBottom: '24px', textShadow: '0 0 20px rgba(255,255,255,0.1)' }}>The Core Problem</h2>
          <p style={{ fontSize: '18px', color: '#CBD5E1', lineHeight: 1.7 }}>
            Traditional static disaster plans fail the moment roads collapse or floodwaters rise. 
            Aapda Setu replaces static binders with a dynamic, mathematically optimized assignment engine that updates in real-time as conditions change on the ground.
          </p>
        </motion.div>

        {/* Capabilities Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
          <Card 
            icon={Database} 
            title="Multi-Hazard ML Pipeline" 
            desc="Authentic models trained on live datasets predict flood and landslide susceptibility, overriding default hazard scores automatically." 
          />
          <Card 
            icon={Cpu} 
            title="CP-SAT Re-optimization" 
            desc="Using OR-Tools to dynamically re-route populations away from compromised infrastructure while strictly respecting shelter capacities." 
          />
          <Card 
            icon={Users} 
            title="Human-in-the-Loop" 
            desc="Algorithms propose, humans dispose. A robust pending-approval workflow ensures all AI-driven interventions are verified by operational leaders." 
          />
        </div>
      </section>

      {/* Demo Banner */}
      <div style={{ padding: '48px 24px', backgroundColor: 'rgba(18, 18, 18, 0.4)', borderTop: '1px solid rgba(255, 255, 255, 0.1)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center', backdropFilter: 'blur(15px)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ maxWidth: '800px', margin: '0 auto' }}
        >
          <h3 style={{ color: '#6366F1', fontSize: '20px', fontWeight: 600, marginBottom: '12px', textShadow: '0 0 10px rgba(99,102,241,0.3)' }}>Sandbox Demo Environment</h3>
          <p style={{ color: '#94A3B8', margin: 0, fontSize: '15px' }}>
            This is an interactive prototype demonstrating the system architecture. All telemetry and ML data are sourced from controlled offline datasets. 
          </p>
        </motion.div>
      </div>

      <footer style={{ padding: '48px 24px', textAlign: 'center', color: '#475569', fontSize: '14px' }}>
        &copy; 2026 Aapda Setu Operations. Built for high-reliability environments.
      </footer>
    </div>
  );
};

export default LandingPage;
