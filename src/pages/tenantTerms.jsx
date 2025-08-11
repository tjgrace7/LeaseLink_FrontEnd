import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { getLeaseDocs } from "../utilities/GetMessages";
import DisplayBox from "../components/DisplayBox";
import { getTable } from "../utilities/supabaseCalls";

const TenantTerms = () => {
    const { tenant_id } = useParams()
    const [tenantName, setTenantName] = useState('')

    const [basicLease, setBasicLease] = useState([]);
    const [rent, setRent] = useState([])
    const [expense, setExpense] = useState([])
    const [legal, setLegal] = useState([])
    const [options, setOptions] = useState([])
    const [special, setSpecial] = useState([])
    const [landlord, setLandlord] = useState([])

    useEffect(() => {
        if (!tenant_id) return;
        const getDocs = async () => {
            const doc = await getLeaseDocs(tenant_id);
            setBasicLease(doc.basic_lease);
            setRent(doc.rent);
            setExpense(doc.expense)
            setLegal(doc.legal)
            setSpecial(doc.special)
            setOptions(doc.options)
            setLandlord(doc.landlord)
        }
        getDocs()
        const gettenantName = async () => {
            const tenant = await getTable('tenant', 'tenant_id', tenant_id)
            if(!tenant) console.error("Error Fetching Tenant")
            setTenantName(tenant[0].Tenant_Name)
        }
        gettenantName()
    }, [tenant_id])

    return (
        <div className="m-4">
            <div className="flex items-center">
                {tenantName != '' && (
                <h1 className="text-2xl underline">{tenantName}</h1>
                )}
            </div>
            <div className="flex items-center overflow-x-auto">
                <DisplayBox className='mr-6 flex overflow-y-auto'>
                    <div>
                        <h2 className="text-2xl"><u>Basic Lease Details</u></h2>
                        {basicLease.length > 0 && basicLease.map((item, index) => {
                            const [[key, value]] = Object.entries(item);

                            // ❌ Skip empty values

                            return (
                                <div key={index} className="mb-4">
                                    <div className="flex flex-row items-center">
                                        <h2 className="text-lg mr-2">{key}:</h2>
                                        <p>{value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </DisplayBox>
                <DisplayBox className='mr-6 flex overflow-y-auto'>
                    <div>
                        <h2 className="text-2xl"><u>Rent & Financial Terms</u></h2>
                        {rent.length > 0 && rent.map((item, index) => {
                            const [[key, value]] = Object.entries(item);

                            // ❌ Skip empty values

                            return (
                                <div key={index} className="mb-4">
                                    <div className="flex flex-row items-center">
                                        <h2 className="text-lg mr-2">{key}:</h2>
                                        <p>{value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </DisplayBox>
            </div>
                        <div className="flex items-center overflow-x-auto">
                <DisplayBox className='mr-6 flex overflow-y-auto'>
                    <div>
                        <h2 className="text-2xl"><u>Reimbursement & Expense Responsibilities</u></h2>
                        {expense.length > 0 && expense.map((item, index) => {
                            const [[key, value]] = Object.entries(item);

                            // ❌ Skip empty values

                            return (
                                <div key={index} className="mb-4">
                                    <div className="flex flex-row items-center">
                                        <h2 className="text-lg mr-2">{key}:</h2>
                                        <p>{value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </DisplayBox>
                <DisplayBox className='mr-6 flex overflow-y-auto'>
                    <div>
                        <h2 className="text-2xl"><u>Legal, Risk & Liability</u></h2>
                        {legal.length > 0 && legal.map((item, index) => {
                            const [[key, value]] = Object.entries(item);

                            // ❌ Skip empty values

                            return (
                                <div key={index} className="mb-4">
                                    <div className="flex flex-row items-center">
                                        <h2 className="text-lg mr-2">{key}:</h2>
                                        <p>{value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </DisplayBox>
            </div>
                     <div className="flex items-center overflow-x-auto">
                <DisplayBox className='mr-6 flex overflow-y-auto'>
                    <div>
                        <h2 className="text-2xl"><u>Options & Deadlines</u></h2>
                        {options.length > 0 && options.map((item, index) => {
                            const [[key, value]] = Object.entries(item);

                            // ❌ Skip empty values

                            return (
                                <div key={index} className="mb-4">
                                    <div className="flex flex-row items-center">
                                        <h2 className="text-lg mr-2">{key}:</h2>
                                        <p>{value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </DisplayBox>
                <DisplayBox className='mr-6 flex overflow-y-auto'>
                    <div>
                        <h2 className="text-2xl"><u>Special Rights & Limitations</u></h2>
                        {special.length > 0 && special.map((item, index) => {
                            const [[key, value]] = Object.entries(item);

                            // ❌ Skip empty values

                            return (
                                <div key={index} className="mb-4">
                                    <div className="flex flex-row items-center">
                                        <h2 className="text-lg mr-2">{key}:</h2>
                                        <p>{value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </DisplayBox>
            </div>
                     <div className="flex items-center overflow-x-auto">
                <DisplayBox className='mr-6 flex overflow-y-auto'>
                    <div>
                        <h2 className="text-2xl"><u>Landlord & Tenant Work Obligations</u></h2>
                        {landlord.length > 0 && landlord.map((item, index) => {
                            const [[key, value]] = Object.entries(item);

                            // ❌ Skip empty values

                            return (
                                <div key={index} className="mb-4">
                                    <div className="flex flex-row items-center">
                                        <h2 className="text-lg mr-2">{key}:</h2>
                                        <p>{value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </DisplayBox>
            </div>
        </div>
    )
}

export default TenantTerms;