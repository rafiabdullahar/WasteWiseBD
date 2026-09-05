import { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Star,
  Truck,
  Calendar,
  Clock,
  MapPin,
  Package,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";


const CollectorDashboard = () => {

  const { user } = useAuth();


  const [performance, setPerformance] = useState(null);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);



  const fetchData = async () => {

    try {

      const performanceResponse =
        await api.get("/collectors/performance");


      setPerformance(
        performanceResponse.data.data.performance
      );



      const requestsResponse =
        await api.get("/collectors/pickup-requests");


      setRequests(
        requestsResponse.data.data.requests
      );


    } catch(error){

      console.log(error);

    }
    finally{

      setIsLoading(false);

    }

  };





  useEffect(()=>{

    fetchData();

  },[]);





  const updateStatus = async(id,status)=>{

    try{

      await api.patch(
        `/collectors/pickup-requests/${id}/status`,
        {
          status
        }
      );


      await fetchData();


    }catch(error){

      console.log(error);

      alert(
        error.response?.data?.message ||
        "Status update failed"
      );

    }

  };





  if(isLoading)
    return null;





  return (

    <div className="space-y-8 animate-fade-in">


      {/* Header */}

      <div className="section-header">

        <div>

          <h1 className="page-title">
            Collector Dashboard
          </h1>


          <p className="page-subtitle">
            Welcome back, {user?.name}. Here is your performance overview.
          </p>

        </div>

      </div>





      {/* Performance Cards */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">


        <div className="stat-card">

          <div className="flex items-center gap-4">

            <div className="w-12 h-12 rounded-xl bg-green-900/50 flex items-center justify-center text-green-400">

              <CheckCircle2 />

            </div>


            <div>

              <p className="text-gray-400 text-sm">
                Completed
              </p>

              <h3 className="text-2xl font-bold text-white">
                {performance?.totalCompleted || 0}
              </h3>

            </div>


          </div>

        </div>





        <div className="stat-card">


          <div className="flex items-center gap-4">


            <div className="w-12 h-12 rounded-xl bg-red-900/50 flex items-center justify-center text-red-400">

              <XCircle />

            </div>


            <div>

              <p className="text-gray-400 text-sm">
                Failed
              </p>


              <h3 className="text-2xl font-bold text-white">

                {performance?.totalFailed || 0}

              </h3>

            </div>


          </div>


        </div>





        <div className="stat-card">


          <div className="flex items-center gap-4">


            <div className="w-12 h-12 rounded-xl bg-blue-900/50 flex items-center justify-center text-blue-400">

              <Truck />

            </div>


            <div>

              <p className="text-gray-400 text-sm">
                Success Rate
              </p>


              <h3 className="text-2xl font-bold text-white">

                {performance?.successRate || "0%"}

              </h3>


            </div>


          </div>


        </div>





        <div className="stat-card">


          <div className="flex items-center gap-4">


            <div className="w-12 h-12 rounded-xl bg-yellow-900/50 flex items-center justify-center text-yellow-400">

              <Star />

            </div>


            <div>

              <p className="text-gray-400 text-sm">
                Avg Rating
              </p>


              <h3 className="text-2xl font-bold text-white">

                {performance?.averageRating || 0}/5

              </h3>


            </div>


          </div>


        </div>


      </div>






      {/* Pickup Requests */}

      <div className="card">


        <div className="flex justify-between mb-6">

          <div>

            <h2 className="text-xl font-semibold text-white">

              Assigned Pickup Requests

            </h2>


            <p className="text-gray-400">

              Waste collection tasks assigned to you.

            </p>


          </div>


          <span className="text-gray-400">

            {requests.length} requests

          </span>


        </div>





        {requests.length===0 && (

          <p className="text-center text-gray-500 py-10">

            No assigned pickup requests.

          </p>

        )}






        <div className="space-y-6">


        {requests.map((request)=>(


          <div
            key={request._id}
            className="border border-gray-700 rounded-xl p-6"
          >



            <div className="flex justify-between">


              <h3 className="text-xl font-semibold text-white">

                Pickup Request

              </h3>


              <span className="px-4 py-1 rounded-full bg-blue-900/50 text-blue-300">

                {request.status}

              </span>


            </div>





            <p className="text-gray-500 text-sm mt-2">

              ID: {request._id}

            </p>






            <div className="grid md:grid-cols-2 gap-6 mt-6">



              <div className="flex gap-3">

                <Package className="text-green-400"/>

                <div>

                  <p className="text-gray-400">
                    Resident
                  </p>

                  <p className="text-white font-semibold">

                    {request.resident?.name}

                  </p>

                  <p className="text-gray-400">

                    {request.resident?.phone}

                  </p>

                </div>

              </div>






              <div className="flex gap-3">

                <Calendar className="text-blue-400"/>

                <div>

                  <p className="text-gray-400">
                    Preferred Date
                  </p>


                  <p className="text-white">

                    {new Date(request.preferredDate)
                    .toDateString()}

                  </p>


                </div>

              </div>






              <div className="flex gap-3">

                <Clock className="text-yellow-400"/>

                <div>

                  <p className="text-gray-400">
                    Time
                  </p>

                  <p className="text-white">

                    {request.preferredTimeSlot}

                  </p>


                </div>

              </div>







              <div className="flex gap-3">

                <MapPin className="text-red-400"/>

                <div>

                  <p className="text-gray-400">
                    Location
                  </p>

                  <p className="text-white">

                    {request.pickupAddress?.street}

                  </p>


                  <p className="text-gray-400">

                    {request.pickupAddress?.city}

                  </p>


                </div>


              </div>



            </div>








            {/* ACTION BUTTONS */}

            <div className="mt-6 flex gap-4">


            {
              request.status==="assigned" && (

                <button

                onClick={()=>updateStatus(
                  request._id,
                  "on_the_way"
                )}

                className="btn-primary"

                >

                  Start Pickup

                </button>

              )
            }






            {
              request.status==="on_the_way" && (

                <>


                <button

                onClick={()=>updateStatus(
                  request._id,
                  "collected"
                )}

                className="bg-green-600 px-5 py-2 rounded-lg text-white"

                >

                  Mark Collected

                </button>





                <button

                onClick={()=>updateStatus(
                  request._id,
                  "failed"
                )}

                className="bg-red-600 px-5 py-2 rounded-lg text-white"

                >

                  Mark Failed

                </button>


                </>

              )
            }



            </div>





          </div>


        ))}


        </div>


      </div>


    </div>

  );

};


export default CollectorDashboard;