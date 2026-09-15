const fs = require('fs');
let dash = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');

const startStr = `<motion.div
                initial={{ y: -50, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -50, opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, type: 'spring' }}
                className="approval-modal"`;

const startIdx = dash.indexOf(startStr);
if (startIdx === -1) {
  console.log("Could not find start string in Dashboard");
  process.exit(1);
}

// Find the closing tag </motion.div> that corresponds to this one.
// Actually, it's just before "{/* REJECT TOAST */}" or similar.
let endStr = `</motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {rejectToast`;

let endIdx = dash.indexOf(endStr);
if (endIdx === -1) {
    endStr = `</motion.div>
            )}
          </AnimatePresence>`;
    endIdx = dash.indexOf(endStr, startIdx);
}

if (endIdx === -1) {
  console.log("Could not find end string in Dashboard");
  process.exit(1);
}

const modalJSX = dash.substring(startIdx, endIdx + 13); // includes </motion.div>

const modalComponentCode = `import React from 'react';
import { motion } from 'framer-motion';

const ApprovalModal = ({ pendingPlanData, handleApprove, handleReject }) => {
  return (
    ${modalJSX}
  );
};

export default ApprovalModal;
`;

fs.writeFileSync('src/components/ApprovalModal.jsx', modalComponentCode);
console.log("Extracted ApprovalModal.jsx");

// Now replace it in Dashboard.jsx
dash = dash.substring(0, startIdx) + `<ApprovalModal pendingPlanData={pendingPlanData} handleApprove={handleApprove} handleReject={handleReject} />` + dash.substring(endIdx + 13);

// add import
dash = `import ApprovalModal from '../components/ApprovalModal';\n` + dash;

fs.writeFileSync('src/pages/Dashboard.jsx', dash);
console.log("Updated Dashboard.jsx");
