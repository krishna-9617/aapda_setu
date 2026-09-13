import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { API_BASE_URL } from "../config";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Download, FileText } from "lucide-react";

const AuditLogPage = ({ theme }) => {
  const [auditLog, setAuditLog] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/audit-log`)
      .then(r => r.json())
      .then(data => setAuditLog(data))
      .catch(e => console.error(e));
  }, []);

  const exportAuditLog = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLog, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "aapda_setu_audit_log.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen p-8 pt-28 pb-20 relative overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute top-[30%] left-[20%] w-[60%] h-[40%] rounded-full bg-cyan-900/10 blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6"
        >
          <div>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 mb-4">
              <FileText className="text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">System Audit Log</h1>
            <p className="text-slate-400 text-sm max-w-xl">
              An immutable record of all interventions, scenario implementations, and optimization triggers that affect the live operational plan.
            </p>
          </div>

          <ShimmerButton
            onClick={exportAuditLog}
            background="rgba(6, 182, 212, 0.1)"
            shimmerColor="rgba(255,255,255,0.4)"
          >
            <span className="text-cyan-400 text-sm font-semibold tracking-wide flex items-center gap-2 px-2">
              <Download className="w-4 h-4" /> Export JSON
            </span>
          </ShimmerButton>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-2xl"
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white/[0.02] border-b border-white/10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold py-4 px-6 w-[220px]">Timestamp</TableHead>
                  <TableHead className="text-slate-400 font-semibold py-4 px-6 w-[200px]">Action Type</TableHead>
                  <TableHead className="text-slate-400 font-semibold py-4 px-6">Description</TableHead>
                  <TableHead className="text-slate-400 font-semibold py-4 px-6 text-right w-[150px]">Objective Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLog.length === 0 ? (
                  <TableRow className="hover:bg-transparent border-white/5">
                    <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                      No audit logs recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLog.map((log, i) => (
                    <TableRow 
                      key={i}
                      className="border-white/5 hover:bg-white/[0.05] transition-colors group cursor-default"
                    >
                      <TableCell className="py-4 px-6 text-slate-300 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-slate-300">
                        {log.details}
                      </TableCell>
                      <TableCell className="py-4 px-6 text-right font-semibold text-cyan-400">
                        {log.objective ? log.objective.toFixed(1) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AuditLogPage;
