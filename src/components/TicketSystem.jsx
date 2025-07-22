import { useAuth } from "./AuthProvider";
import { useState,  } from 'react'
import { getLogs, getErrors, clearLogs } from "../utilities/logCollector";
import { supabase } from "../supabaseClient";


const TicketSystem = () => {
    const asanaaccess = import.meta.env.VITE_ASANA_ACCESS_TOKEN;
    const { userData } = useAuth();
    const [isOpen, setIsOpen] = useState(false)



const SubmitTicket = async (message) => {
  const today = new Date().toISOString().split("T")[0];
  const logs = getLogs();
  const errors = getErrors();

  const { data: Company, error: companyError } = await supabase
    .from('Property_Management_Companies')
    .select("*")
    .eq('company_id', userData.company_id)
    .single();

  if (companyError) {
    console.error("Error fetching company name:", companyError);
    return;
  }

  const taskName = `${userData.Name|| userData.auth_id}  ${Company.company_name}  ${today}`;

  const notes = `User: ${userData.Name || 'Unknown'} 
\nUser_Auth_Id: ${userData.auth_id} 
\nCompany_Name: ${Company.company_name} 
\nCompany_Id: ${userData.company_id} 

\nUser's Input: ${message} 

\nConsole Logs:\n${logs} 
\nConsole Errors:\n${errors}`;

  try {
    const response = await fetch('https://app.asana.com/api/1.0/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${asanaaccess}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          'name': taskName,
          'notes': notes,
          'projects': ["1210831492845292"],
          "due_on": today
        }
      })
    });

    const task = await response.json();

    await fetch(`https://app.asana.com/api/1.0/sections/1210831492845293/addTask`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${asanaaccess}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          task: task.data.gid
        }
      })
    });

    clearLogs();
  } catch (err) {
    console.error("Error submitting ticket:", err);
  }
};


    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Toggle button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg"
            >
                {isOpen ? 'Close' : 'Request Help'}
            </button>

            {/* Ticket form (basic example) */}
            {isOpen && (
                <div className="mt-2 p-4 w-80 bg-white text-black rounded shadow-xl">
                    <h2 className="text-lg font-semibold mb-2">Submit a Ticket</h2>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target
                        const message = form.elements.message.value;
                        
                        SubmitTicket(message);
                        alert('Submitted!');
                        setIsOpen(false);
                    }}>
                        <textarea
                            name="message"
                            placeholder="Describe your issue..."
                            className="w-full h-24 p-2 border border-gray-300 rounded mb-2"
                            required
                        />
                        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700" >
                            Submit
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};
export default TicketSystem