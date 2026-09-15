const fs = require('fs');
let dash = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');
const lines = dash.split('\n');
let startLine = -1;
let endLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('className="approval-modal"')) {
    startLine = i - 5; // <motion.div line
  }
  if (startLine !== -1 && i > startLine + 10 && lines[i].includes('</motion.div>') && lines[i].includes('              </motion.div>')) {
    endLine = i;
    break;
  }
}
if (startLine !== -1 && endLine !== -1) {
  const jsx = lines.slice(startLine, endLine + 1).join('\n');
  const code = `import React from 'react';
import { motion } from 'framer-motion';

const ApprovalModal = ({ pendingPlanData, onApprove, onReject }) => {
  return (
` + jsx.replace('onClick={handleApprove}', 'onClick={onApprove}').replace('onClick={handleReject}', 'onClick={onReject}') + `
  );
};
export default ApprovalModal;`;
  fs.writeFileSync('src/components/ApprovalModal.jsx', code);
  
  lines.splice(startLine, endLine - startLine + 1, '                <ApprovalModal pendingPlanData={pendingPlanData} onApprove={handleApprove} onReject={handleReject} />');
  let newDash = `import ApprovalModal from '../components/ApprovalModal';\n` + lines.join('\n');
  fs.writeFileSync('src/pages/Dashboard.jsx', newDash);
  console.log('Success');
} else {
  console.log('Failed to find lines', startLine, endLine);
}
