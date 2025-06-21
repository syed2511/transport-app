import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, setLogLevel } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Truck, Package, Users, DollarSign, PlusCircle, Edit, Trash2, X } from 'lucide-react';

// --- shadcn/ui-like Components (self-contained) ---
// As we can't import, we'll create simplified versions of these components here.

const Card = ({ children, className = '' }) => (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ children, className = '' }) => (
    <div className={`p-6 flex flex-row items-center justify-between space-y-0 pb-2 ${className}`}>
        {children}
    </div>
);

const CardTitle = ({ children, className = '' }) => (
    <h3 className={`tracking-tight text-sm font-medium text-gray-500 dark:text-gray-400 ${className}`}>
        {children}
    </h3>
);

const CardContent = ({ children, className = '' }) => (
    <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

const Button = ({ children, onClick, className = '', variant = 'default', size = 'default' }) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    const variants = {
        default: 'bg-gray-900 text-gray-50 hover:bg-gray-900/90 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90',
        destructive: 'bg-red-500 text-gray-50 hover:bg-red-500/90',
        outline: 'border border-gray-200 bg-transparent hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800',
        ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800',
    };
    const sizes = {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        icon: 'h-10 w-10',
    };
    return (
        <button onClick={onClick} className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}>
            {children}
        </button>
    );
};

const Input = ({ className = '', type = 'text', ...props }) => (
    <input
        type={type}
        className={`flex h-10 w-full rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
    />
);

const Label = ({ children, htmlFor, className = '' }) => (
    <label htmlFor={htmlFor} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>
        {children}
    </label>
);

const Dialog = ({ open, onClose, children }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="relative z-50 grid w-full max-w-lg gap-4 border bg-white dark:bg-gray-900 p-6 shadow-lg duration-200 sm:rounded-lg">
                {children}
                <button onClick={onClose} className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
            </div>
        </div>
    );
};

const DialogHeader = ({ children }) => <div className="flex flex-col space-y-1.5 text-center sm:text-left">{children}</div>;
const DialogTitle = ({ children }) => <h2 className="text-lg font-semibold leading-none tracking-tight">{children}</h2>;
const DialogDescription = ({ children }) => <p className="text-sm text-gray-500 dark:text-gray-400">{children}</p>;
const DialogContent = ({ children }) => <div className="py-4">{children}</div>;
const DialogFooter = ({ children }) => <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">{children}</div>;

const Table = ({ children, className = '' }) => <div className="relative w-full overflow-auto"><table className={`w-full caption-bottom text-sm ${className}`}>{children}</table></div>;
const TableHeader = ({ children, className = '' }) => <thead className={`[&_tr]:border-b ${className}`}>{children}</thead>;
const TableBody = ({ children, className = '' }) => <tbody className={`[&_tr:last-child]:border-0 ${className}`}>{children}</tbody>;
const TableRow = ({ children, className = '' }) => <tr className={`border-b transition-colors hover:bg-gray-100/50 dark:hover:bg-gray-800/50 ${className}`}>{children}</tr>;
const TableHead = ({ children, className = '' }) => <th className={`h-12 px-4 text-left align-middle font-medium text-gray-500 dark:text-gray-400 [&:has([role=checkbox])]:pr-0 ${className}`}>{children}</th>;
const TableCell = ({ children, className = '' }) => <td className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`}>{children}</td>;


// --- Main App ---

// PASTE YOUR FIREBASE CONFIG OBJECT HERE
const firebaseConfig = {
  apiKey: "AIzaSyCNt6pB90xSr2yzyLe_ZvXhmFGBud5-kQA",
  authDomain: "mytransportapp-bc4e6.firebaseapp.com",
  projectId: "mytransportapp-bc4e6",
  storageBucket: "mytransportapp-bc4e6.firebasestorage.app",
  messagingSenderId: "125627034930",
  appId: "1:125627034930:web:294f3fa9e1afd5081e7b2b",
  measurementId: "G-WJSGRK735L"
};

// This section should only appear ONCE in the file.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-transport-app';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// setLogLevel('debug'); // Uncomment for detailed Firestore logs



const ConsignmentForm = ({ isOpen, onClose, consignment, onSave }) => {
    const [formData, setFormData] = useState({});

    useEffect(() => {
        // Helper to format Firestore Timestamps or Date objects to a string for datetime-local input
        const formatDateTime = (ts) => {
            if (!ts) return '';
            // It might be a Firestore Timestamp (on edit) or a Date object
            const d = ts.toDate ? ts.toDate() : ts;
            // Adjust for timezone offset to display correctly in the input
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            return d.toISOString().slice(0, 16);
        };
            
        if (consignment) {
            // Editing an existing consignment
            setFormData({
                ...consignment,
                consignmentDateTime: formatDateTime(consignment.consignmentDateTime),
                warehouseReceivedDateTime: formatDateTime(consignment.warehouseReceivedDateTime), // Format new field
                receivingDateTime: formatDateTime(consignment.receivingDateTime),
                deliveringDateTime: formatDateTime(consignment.deliveringDateTime),
            });
        } else {
            // Adding a new consignment
            const now = new Date();
            setFormData({
                consignmentNo: '',
                consignorName: '',
                consigneeName: '',
                consignmentDateTime: formatDateTime(now), // Default to now
                warehouseReceivedDateTime: formatDateTime(now), // Default to now
                status: 'Received',
                receivingDateTime: '',
                deliveringDateTime: '',
                freight: 0,
                charges: 0,
                stdCharges: 0,
                remarks: '',
                paymentStatus: 'Due'
            });
        }
    }, [consignment, isOpen]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = () => {
        // Convert local datetime strings back to Firestore Timestamp objects
        const dataToSave = {
            ...formData,
            consignmentDateTime: formData.consignmentDateTime ? new Date(formData.consignmentDateTime) : null,
            warehouseReceivedDateTime: formData.warehouseReceivedDateTime ? new Date(formData.warehouseReceivedDateTime) : null, // Convert new field
            receivingDateTime: formData.receivingDateTime ? new Date(formData.receivingDateTime) : null,
            deliveringDateTime: formData.deliveringDateTime ? new Date(formData.deliveringDateTime) : null,
        };
        onSave(dataToSave);
        onClose();
    };
    
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={onClose}>
            <DialogHeader>
                <DialogTitle>{consignment ? 'Edit Consignment' : 'Add New Consignment'}</DialogTitle>
                <DialogDescription>
                    Fill in the details below. Click save when you're done.
                </DialogDescription>
            </DialogHeader>
            <DialogContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div className="space-y-2">
                        <Label htmlFor="consignmentNo">Consignment No.</Label>
                        <Input id="consignmentNo" name="consignmentNo" value={formData.consignmentNo || ''} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="consignorName">Consignor Name</Label>
                        <Input id="consignorName" name="consignorName" value={formData.consignorName || ''} onChange={handleChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="consigneeName">Consignee Name</Label>
                        <Input id="consigneeName" name="consigneeName" value={formData.consigneeName || ''} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="consignmentDateTime">Consignment Date & Time</Label>
                        <Input id="consignmentDateTime" name="consignmentDateTime" type="datetime-local" value={formData.consignmentDateTime || ''} onChange={handleChange} />
                    </div>
                    {/* NEW FIELD ADDED HERE */}
                    <div className="space-y-2">
                        <Label htmlFor="warehouseReceivedDateTime">Warehouse Received Time</Label>
                        <Input id="warehouseReceivedDateTime" name="warehouseReceivedDateTime" type="datetime-local" value={formData.warehouseReceivedDateTime || ''} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <select id="status" name="status" value={formData.status || 'Received'} onChange={handleChange} className="flex h-10 w-full rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2 text-sm">
                            <option>Received</option>
                            <option>In Transit</option>
                            <option>Delivered</option>
                        </select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="paymentStatus">Payment Status</Label>
                        <select id="paymentStatus" name="paymentStatus" value={formData.paymentStatus || 'Due'} onChange={handleChange} className="flex h-10 w-full rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2 text-sm">
                            <option>Due</option>
                            <option>Paid</option>
                        </select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="receivingDateTime">Receiving Date & Time (by Consignee)</Label>
                        <Input id="receivingDateTime" name="receivingDateTime" type="datetime-local" value={formData.receivingDateTime || ''} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="deliveringDateTime">Delivering Date & Time</Label>
                        <Input id="deliveringDateTime" name="deliveringDateTime" type="datetime-local" value={formData.deliveringDateTime || ''} onChange={handleChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="freight">Freight (₹)</Label>
                        <Input id="freight" name="freight" type="number" value={formData.freight || 0} onChange={handleChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="charges">Other Charges (₹)</Label>
                        <Input id="charges" name="charges" type="number" value={formData.charges || 0} onChange={handleChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="stdCharges">STD Charges (₹)</Label>
                        <Input id="stdCharges" name="stdCharges" type="number" value={formData.stdCharges || 0} onChange={handleChange} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="remarks">Remarks</Label>
                        <Input id="remarks" name="remarks" value={formData.remarks || ''} onChange={handleChange} />
                    </div>
                </div>
            </DialogContent>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit}>Save Consignment</Button>
            </DialogFooter>
        </Dialog>
    );
};

const Dashboard = ({ consignments, onSave, onDelete, onEdit }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingConsignment, setEditingConsignment] = useState(null);

    const handleAddNew = () => {
        setEditingConsignment(null);
        setIsModalOpen(true);
    };

    const handleEdit = (consignment) => {
        setEditingConsignment(consignment);
        setIsModalOpen(true);
    };

    const handleSave = (data) => {
        onSave(data);
    };
    
    const formatDate = (timestamp) => {
        if (!timestamp || !timestamp.toDate) return 'N/A';
        return timestamp.toDate().toLocaleString();
    };

    const totalConsignments = consignments.length;
    const deliveredCount = consignments.filter(c => c.status === 'Delivered').length;
    const dueCount = consignments.filter(c => c.paymentStatus === 'Due').length;
    const totalFreight = consignments.reduce((sum, c) => sum + (c.freight || 0), 0);

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Total Consignments</CardTitle>
                        <Package className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalConsignments}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total consignments recorded</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Delivered</CardTitle>
                        <Truck className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{deliveredCount}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{((deliveredCount/totalConsignments || 0)*100).toFixed(1)}% of total</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Payments Due</CardTitle>
                        <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dueCount}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Consignments with outstanding payment</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Total Freight Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalFreight.toLocaleString('en-IN')}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Across all consignments</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                     <div>
                        <CardTitle>Recent Consignments</CardTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage all your transport records.</p>
                    </div>
                    <Button onClick={handleAddNew} size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Consignment #</TableHead>
                                <TableHead>Consignor</TableHead>
                                <TableHead>Consignee</TableHead>
                                <TableHead>Date</TableHead>
                                {/* NEW COLUMN HEADER ADDED */}
                                <TableHead>Warehouse Rcvd</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead className="text-right">Total (₹)</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {consignments.length > 0 ? (
                                consignments.map(c => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">{c.consignmentNo}</TableCell>
                                        <TableCell>{c.consignorName}</TableCell>
                                        <TableCell>{c.consigneeName}</TableCell>
                                        <TableCell>{formatDate(c.consignmentDateTime)}</TableCell>
                                        {/* NEW TABLE CELL FOR DATA */}
                                        <TableCell>{formatDate(c.warehouseReceivedDateTime)}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                c.status === 'Delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                                                c.status === 'In Transit' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                                                'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                                            }`}>
                                                {c.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                             <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                c.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                            }`}>
                                                {c.paymentStatus}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {( (c.freight || 0) + (c.charges || 0) + (c.stdCharges || 0) ).toLocaleString('en-IN')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end space-x-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => onDelete(c.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan="9" className="text-center h-24">No consignments found. Add one to get started.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <ConsignmentForm 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                consignment={editingConsignment}
                onSave={handleSave}
            />
        </div>
    );
};

const DueTracker = ({ consignments }) => {
    const dueData = useMemo(() => {
        const dues = consignments
            .filter(c => c.paymentStatus === 'Due')
            .reduce((acc, c) => {
                const total = (c.freight || 0) + (c.charges || 0) + (c.stdCharges || 0);
                if (!acc[c.consigneeName]) {
                    acc[c.consigneeName] = { totalDue: 0, count: 0 };
                }
                acc[c.consigneeName].totalDue += total;
                acc[c.consigneeName].count += 1;
                return acc;
            }, {});

        return Object.entries(dues)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.totalDue - a.totalDue);
    }, [consignments]);

    const totalDueAmount = dueData.reduce((sum, item) => sum + item.totalDue, 0);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Total Outstanding Dues</CardTitle>
                        <div className="text-3xl font-bold text-red-600">₹{totalDueAmount.toLocaleString('en-IN')}</div>
                    </div>
                     <DollarSign className="h-8 w-8 text-red-500" />
                </CardHeader>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Dues by Consignee</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400">List of all consignees with pending payments.</p>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Consignee Name</TableHead>
                                <TableHead>No. of Due Consignments</TableHead>
                                <TableHead className="text-right">Total Due Amount (₹)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dueData.length > 0 ? (
                                dueData.map(due => (
                                    <TableRow key={due.name}>
                                        <TableCell className="font-medium">{due.name}</TableCell>
                                        <TableCell>{due.count}</TableCell>
                                        <TableCell className="text-right font-semibold text-red-500">{due.totalDue.toLocaleString('en-IN')}</TableCell>
                                    </TableRow>
                                ))
                             ) : (
                                <TableRow>
                                    <TableCell colSpan="3" className="text-center h-24">No outstanding dues. Great work!</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

const Accounts = ({ consignments }) => {
    const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);

    const monthlyData = useMemo(() => {
        const paidConsignments = consignments.filter(c => c.paymentStatus === 'Paid' && c.deliveringDateTime);

        const filteredByMonth = paidConsignments.filter(c => {
            const deliveryDate = c.deliveringDateTime.toDate();
            const monthStr = `${deliveryDate.getFullYear()}-${String(deliveryDate.getMonth() + 1).padStart(2, '0')}`;
            return monthStr === selectedMonth;
        });

        const totals = filteredByMonth.reduce((acc, c) => {
            acc.freight += c.freight || 0;
            acc.charges += c.charges || 0;
            acc.stdCharges += c.stdCharges || 0;
            acc.total += (c.freight || 0) + (c.charges || 0) + (c.stdCharges || 0);
            return acc;
        }, { freight: 0, charges: 0, stdCharges: 0, total: 0 });

        const chartData = filteredByMonth.reduce((acc, c) => {
             const day = c.deliveringDateTime.toDate().getDate();
             if(!acc[day]) {
                 acc[day] = { name: `Day ${day}`, freight: 0, charges: 0, stdCharges: 0 };
             }
             acc[day].freight += c.freight || 0;
             acc[day].charges += c.charges || 0;
             acc[day].stdCharges += c.stdCharges || 0;
             return acc;
        }, {});


        return { totals, chartData: Object.values(chartData).sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric: true})) };
    }, [consignments, selectedMonth]);

    const handleMonthChange = (e) => {
        setSelectedMonth(e.target.value);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Accounts Summary</CardTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400">View monthly collections from paid consignments.</p>
                    </div>
                    <Input type="month" value={selectedMonth} onChange={handleMonthChange} className="w-48"/>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                        <Card>
                           <CardHeader>
                                <CardTitle>Total Collection</CardTitle>
                                <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            </CardHeader>
                            <CardContent>
                               <div className="text-2xl font-bold text-green-600">₹{monthlyData.totals.total.toLocaleString('en-IN')}</div>
                            </CardContent>
                        </Card>
                        <Card>
                           <CardHeader>
                                <CardTitle>Total Freight</CardTitle>
                            </CardHeader>
                            <CardContent>
                               <div className="text-2xl font-bold">₹{monthlyData.totals.freight.toLocaleString('en-IN')}</div>
                            </CardContent>
                        </Card>
                         <Card>
                           <CardHeader>
                                <CardTitle>Other Charges</CardTitle>
                            </CardHeader>
                            <CardContent>
                               <div className="text-2xl font-bold">₹{monthlyData.totals.charges.toLocaleString('en-IN')}</div>
                            </CardContent>
                        </Card>
                         <Card>
                           <CardHeader>
                                <CardTitle>STD Charges</CardTitle>
                            </CardHeader>
                            <CardContent>
                               <div className="text-2xl font-bold">₹{monthlyData.totals.stdCharges.toLocaleString('en-IN')}</div>
                            </CardContent>
                        </Card>
                    </div>
                    
                    <h3 className="text-lg font-medium mb-4">Daily Collections for {selectedMonth}</h3>
                    <div className="h-80">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData.chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(value) => `₹${value/1000}k`} />
                                <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                                <Legend />
                                <Bar dataKey="freight" stackId="a" fill="#8884d8" name="Freight" />
                                <Bar dataKey="charges" stackId="a" fill="#82ca9d" name="Other Charges" />
                                <Bar dataKey="stdCharges" stackId="a" fill="#ffc658" name="STD Charges" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};


export default function App() {
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [consignments, setConsignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');

    useEffect(() => {
        const performAuth = async () => {
          try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
              await signInWithCustomToken(auth, __initial_auth_token);
            } else {
              await signInAnonymously(auth);
            }
          } catch (err) {
            console.error("Authentication Error:", err);
            setError("Failed to authenticate. Please refresh the page.");
          }
        };

        performAuth();

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId(null);
            }
            setIsAuthReady(true);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!isAuthReady || !userId) {
            setLoading(isAuthReady ? false : true); // If auth is ready but no user, stop loading.
            return;
        };

        setLoading(true);
        const consignmentsCollectionPath = `/artifacts/${appId}/users/${userId}/consignments`;
        const q = query(collection(db, consignmentsCollectionPath));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const consignmentsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            // In-memory sort since firestore requires composite indexes for multiple orderBys
            consignmentsData.sort((a, b) => {
                const dateA = a.consignmentDateTime?.toDate() || 0;
                const dateB = b.consignmentDateTime?.toDate() || 0;
                return dateB - dateA;
            });

            setConsignments(consignmentsData);
            setLoading(false);
        }, (err) => {
            console.error("Firestore Snapshot Error:", err);
            setError("Failed to load consignment data.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isAuthReady, userId]);

    const handleSaveConsignment = async (data) => {
        if (!userId) {
            alert("You must be logged in to save data.");
            return;
        }
        const consignmentsCollectionPath = `/artifacts/${appId}/users/${userId}/consignments`;
        try {
            if (data.id) {
                const docRef = doc(db, consignmentsCollectionPath, data.id);
                const { id, ...dataToUpdate } = data;
                await updateDoc(docRef, dataToUpdate);
            } else {
                await addDoc(collection(db, consignmentsCollectionPath), data);
            }
        } catch (err) {
            console.error("Error saving consignment:", err);
            setError("Could not save the consignment. Please try again.");
        }
    };
    
    const handleDeleteConsignment = async (id) => {
        if (!userId) {
             alert("You must be logged in to delete data.");
            return;
        }
        // A simple confirmation before deleting
        if (window.confirm("Are you sure you want to delete this consignment? This action cannot be undone.")) {
            const docRef = doc(db, `/artifacts/${appId}/users/${userId}/consignments`, id);
            try {
                await deleteDoc(docRef);
            } catch (err) {
                 console.error("Error deleting consignment:", err);
                 setError("Could not delete the consignment. Please try again.");
            }
        }
    };

    const renderContent = () => {
        if (loading) {
            return <div className="flex items-center justify-center h-64"><p>Loading your data...</p></div>;
        }
         if (error) {
            return <div className="flex items-center justify-center h-64 text-red-500"><p>{error}</p></div>;
        }

        switch (activeTab) {
            case 'dashboard':
                return <Dashboard consignments={consignments} onSave={handleSaveConsignment} onDelete={handleDeleteConsignment} />;
            case 'dues':
                return <DueTracker consignments={consignments} />;
            case 'accounts':
                return <Accounts consignments={consignments} />;
            default:
                return <Dashboard consignments={consignments} onSave={handleSaveConsignment} onDelete={handleDeleteConsignment} />;
        }
    };

    const NavButton = ({ tabName, icon, label }) => (
         <Button
            variant={activeTab === tabName ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveTab(tabName)}
        >
            {icon}
            <span className="ml-3">{label}</span>
        </Button>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
             <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
                <div className="hidden border-r bg-white dark:bg-gray-900 lg:block">
                    <div className="flex flex-col gap-2">
                        <div className="flex h-[60px] items-center border-b px-6">
                            <a href="#" className="flex items-center gap-2 font-semibold">
                                <Truck className="h-6 w-6" />
                                <span>Transport Hub</span>
                            </a>
                        </div>
                        <div className="flex-1 p-4">
                            <nav className="grid items-start gap-1 text-sm font-medium">
                               <NavButton tabName="dashboard" icon={<Package className="h-4 w-4" />} label="Dashboard" />
                               <NavButton tabName="dues" icon={<DollarSign className="h-4 w-4" />} label="Due Tracker" />
                               <NavButton tabName="accounts" icon={<Users className="h-4 w-4" />} label="Accounts" />
                            </nav>
                        </div>
                        <div className="mt-auto p-4 border-t">
                            <p className="text-xs text-gray-500 dark:text-gray-400">User ID:</p>
                            <p className="text-xs break-all">{userId || 'Initializing...'}</p>
                        </div>
                    </div>
                </div>
                 <div className="flex flex-col">
                    <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-white dark:bg-gray-900 px-6 sticky top-0 z-30">
                         {/* Mobile Nav Trigger could go here */}
                         <a href="#" className="lg:hidden flex items-center gap-2 font-semibold">
                            <Truck className="h-6 w-6" />
                            <span className="">Transport Hub</span>
                        </a>
                        <div className="w-full flex-1">
                             {/* Mobile Nav would be here */}
                        </div>
                    </header>
                    <main className="flex-1 p-4 sm:p-6 bg-gray-100/40 dark:bg-black/40">
                       {renderContent()}
                    </main>
                 </div>
             </div>
        </div>
    );
}
