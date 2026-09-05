import CollectorProfile from "../models/CollectorProfile.model.js";
import WastePickupRequest from "../models/WastePickupRequest.model.js";
import User from "../models/User.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";


const VALID_VEHICLE_TYPES = [
  "truck",
  "van",
  "rickshaw",
  "motorcycle",
  "other",
];


// GET PROFILE
export const getProfile = asyncHandler(async (req,res)=>{

  const profile =
    await CollectorProfile.findOne({
      user:req.user._id
    })
    .populate("user","name email phone")
    .populate("serviceAreas","name city");


  if(!profile){
    return sendError(
      res,
      404,
      "Collector profile not found"
    );
  }


  return sendSuccess(
    res,
    200,
    "Profile fetched successfully",
    {
      profile
    }
  );

});



// UPDATE PROFILE
export const updateProfile = asyncHandler(async(req,res)=>{


const allowedFields=[
"vehicleType",
"vehicleNumber",
"workSchedule",
"profilePicture",
"isAvailable",
"serviceAreas",
"employeeId"
];


if(
req.body.vehicleType &&
!VALID_VEHICLE_TYPES.includes(req.body.vehicleType)
){

return sendError(
res,
400,
"Invalid vehicle type"
);

}



const updates={};


allowedFields.forEach(field=>{

if(req.body[field]!==undefined){

updates[field]=req.body[field];

}

});



// Employee IDs must be unique across collectors.
//
// Checked case-insensitively, so "EMP-001" and "emp-001" cannot both exist —
// the unique index on the model is case-sensitive and would let those through.
// An empty value is always allowed: it means "no ID assigned yet", and any
// number of collectors may be in that state.
if(updates.employeeId!==undefined){

updates.employeeId=String(updates.employeeId).trim();


if(updates.employeeId){

const escapedId=updates.employeeId.replace(
/[.*+?^${}()|[\]\\]/g,
"\\$&"
);


const duplicate=
await CollectorProfile.findOne({
user:{$ne:req.user._id},
employeeId:new RegExp(`^${escapedId}$`,"i")
})
.populate("user","name")
.select("user employeeId");


if(duplicate){

return sendError(
res,
409,
`Employee ID "${updates.employeeId}" is already assigned to ${
duplicate.user?.name || "another collector"
}`
);

}

}

}



const userUpdates={};


if(req.body.name)
userUpdates.name=req.body.name.trim();


if(req.body.phone)
userUpdates.phone=req.body.phone.trim();



if(Object.keys(userUpdates).length){

await User.findByIdAndUpdate(
req.user._id,
userUpdates
);

}



const profile =
await CollectorProfile.findOneAndUpdate(
{
user:req.user._id
},
{
$set:updates
},
{
new:true,
runValidators:true
}
)
.populate("user","name email phone")
.populate("serviceAreas","name city");



if(!profile){

return sendError(
res,
404,
"Profile not found"
);

}



return sendSuccess(
res,
200,
"Profile updated successfully",
{
profile
}
);


});




// PERFORMANCE
export const getPerformance =
asyncHandler(async(req,res)=>{


const profile =
await CollectorProfile.findOne({
user:req.user._id
})
.select(
"totalCompleted totalFailed averageRating"
);



if(!profile){

return sendError(
res,
404,
"Profile not found"
);

}



const total =
profile.totalCompleted+
profile.totalFailed;



const rate =
total>0
?
((profile.totalCompleted/total)*100).toFixed(1)
:
"0.0";



return sendSuccess(
res,
200,
"Performance fetched",
{

performance:{

totalCompleted:profile.totalCompleted,

totalFailed:profile.totalFailed,

successRate:`${rate}%`,

averageRating:profile.averageRating

}

}
);


});




// GET ASSIGNED TASKS
export const getAssignedPickupRequests =
asyncHandler(async(req,res)=>{


const collectorProfile =
await CollectorProfile.findOne({
user:req.user._id
});



if(!collectorProfile){

return sendError(
res,
404,
"Collector profile not found"
);

}



const requests =
await WastePickupRequest.find({

assignedCollector:
collectorProfile._id,


status:{
$in:[
"assigned",
"on_the_way",
"collected",
"failed"
]
}

})

.populate(
"resident",
"name email phone"
)

.populate(
"serviceArea",
"name city district"
)

.sort({
preferredDate:1,
createdAt:1
});



return sendSuccess(
res,
200,
"Assigned pickup requests fetched",
{
requests
}
);


});





// UPDATE TASK STATUS
export const updatePickupRequestStatus =
asyncHandler(async(req,res)=>{


const {id}=req.params;

const {status}=req.body;



const allowed=[
"on_the_way",
"collected",
"failed"
];



if(!allowed.includes(status)){

return sendError(
res,
400,
"Invalid status"
);

}



const collectorProfile =
await CollectorProfile.findOne({
user:req.user._id
});



if(!collectorProfile){

return sendError(
res,
404,
"Collector profile not found"
);

}



const request =
await WastePickupRequest.findOne({

_id:id,

assignedCollector:
collectorProfile._id

});



if(!request){

return sendError(
res,
404,
"Task not assigned to this collector"
);

}




// transitions

if(
status==="on_the_way" &&
request.status!=="assigned"
){

return sendError(
res,
400,
"Task must be assigned first"
);

}



if(
(status==="collected" ||
status==="failed")
&&
request.status!=="on_the_way"
){

return sendError(
res,
400,
"Task must be on the way first"
);

}



// prevent duplicate counting

if(
request.status==="collected" ||
request.status==="failed"
){

return sendError(
res,
400,
"Task already completed"
);

}



request.status=status;



if(status==="collected"){

request.completedAt=new Date();

collectorProfile.totalCompleted =
(collectorProfile.totalCompleted||0)+1;

}



if(status==="failed"){

collectorProfile.totalFailed =
(collectorProfile.totalFailed||0)+1;

}



await request.save();

await collectorProfile.save();



return sendSuccess(
res,
200,
"Pickup status updated successfully",
{
request
}
);



});