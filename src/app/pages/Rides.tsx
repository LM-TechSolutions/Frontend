import { useState } from "react";
import { useNavigate } from "react-router";
import { format } from "date-fns";
import { Search, Filter, Eye, Plus } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { mockRides } from "../data/mockData";
import { Ride } from "../types";
import { toast } from "sonner";

export default function Rides() {
  const [rides, setRides] = useState<Ride[]>(mockRides);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [newRideOpen, setNewRideOpen] = useState(false);
  const [newRide, setNewRide] = useState({
    customerName: "",
    customerPhone: "",
    pickupLocation: "",
    dropoffLocation: "",
  });
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-[#F59E0B] text-white",
      dispatched: "bg-[#00BDC3] text-white",
      accepted: "bg-[#00BDC3] text-white",
      arrived: "bg-[#00BDC3] text-white",
      in_progress: "bg-[#00BDC3] text-white",
      completed: "bg-[#10B981] text-white",
      cancelled: "bg-[#EF4444] text-white",
    };
    return colors[status as keyof typeof colors] || "bg-gray-500 text-white";
  };

  const filteredRides = rides.filter((ride) => {
    const matchesSearch =
      ride.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.pickupLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.dropoffLocation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || ride.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreateRide = () => {
    if (
      !newRide.customerName ||
      !newRide.customerPhone ||
      !newRide.pickupLocation ||
      !newRide.dropoffLocation
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const ride: Ride = {
      id: `r${rides.length + 1}`,
      customerId: `c${rides.length + 1}`,
      customerName: newRide.customerName,
      customerPhone: newRide.customerPhone,
      pickupLocation: newRide.pickupLocation,
      pickupCoordinates: { lat: 9.032, lng: 38.7469 },
      dropoffLocation: newRide.dropoffLocation,
      dropoffCoordinates: { lat: 9.0125, lng: 38.7517 },
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      fare: undefined,
    };

    setRides([ride, ...rides]);
    setNewRide({
      customerName: "",
      customerPhone: "",
      pickupLocation: "",
      dropoffLocation: "",
    });
    setNewRideOpen(false);
    toast.success("Ride created successfully!");
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[#111827] mb-1">
          Ride History
        </h2>
        <p className="text-[#6B7280]">View and manage all ride records</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <Input
              placeholder="Search by Ride ID, Customer, Location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={newRideOpen} onOpenChange={setNewRideOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#00BDC3] hover:bg-[#009EA3] text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  New Ride
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle>Create New Ride</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                      id="customerName"
                      value={newRide.customerName}
                      onChange={(e) =>
                        setNewRide({ ...newRide, customerName: e.target.value })
                      }
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Customer Phone</Label>
                    <Input
                      id="customerPhone"
                      value={newRide.customerPhone}
                      onChange={(e) =>
                        setNewRide({
                          ...newRide,
                          customerPhone: e.target.value,
                        })
                      }
                      placeholder="+251 911 234567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pickupLocation">Pickup Location</Label>
                    <Input
                      id="pickupLocation"
                      value={newRide.pickupLocation}
                      onChange={(e) =>
                        setNewRide({
                          ...newRide,
                          pickupLocation: e.target.value,
                        })
                      }
                      placeholder="Enter pickup location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dropoffLocation">Dropoff Location</Label>
                    <Input
                      id="dropoffLocation"
                      value={newRide.dropoffLocation}
                      onChange={(e) =>
                        setNewRide({
                          ...newRide,
                          dropoffLocation: e.target.value,
                        })
                      }
                      placeholder="Enter dropoff location"
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setNewRideOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-[#00BDC3] hover:bg-[#009EA3] text-white"
                    onClick={handleCreateRide}
                  >
                    Create Ride
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-[#E5E7EB] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F9FAFB]">
              <TableHead className="font-semibold">Ride ID</TableHead>
              <TableHead className="font-semibold">Customer</TableHead>
              <TableHead className="font-semibold">Pickup</TableHead>
              <TableHead className="font-semibold">Dropoff</TableHead>
              <TableHead className="font-semibold">Driver</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Time</TableHead>
              <TableHead className="font-semibold">Fare</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRides.map((ride) => (
              <TableRow key={ride.id} className="hover:bg-[#F9FAFB]">
                <TableCell className="font-medium">#{ride.id}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-[#111827]">
                      {ride.customerName}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      {ride.customerPhone}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <p className="text-sm text-[#6B7280] truncate">
                    {ride.pickupLocation}
                  </p>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <p className="text-sm text-[#6B7280] truncate">
                    {ride.dropoffLocation}
                  </p>
                </TableCell>
                <TableCell>
                  {ride.driverName ? (
                    <p className="text-sm text-[#111827]">{ride.driverName}</p>
                  ) : (
                    <p className="text-sm text-[#6B7280] italic">
                      Not assigned
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusBadge(ride.status)}>
                    {ride.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-[#6B7280]">
                  {format(ride.createdAt, "MMM dd, HH:mm")}
                </TableCell>
                <TableCell className="font-medium text-[#111827]">
                  {ride.fare ? `${ride.fare} ETB` : "-"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/rides/${ride.id}`)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredRides.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#6B7280]">No rides found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-[#6B7280]">
          Showing {filteredRides.length} of {rides.length} rides
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-[#00BDC3] text-white hover:bg-[#009EA3]"
          >
            1
          </Button>
          <Button variant="outline" size="sm">
            2
          </Button>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
