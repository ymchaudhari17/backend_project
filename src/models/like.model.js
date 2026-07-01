import mongoose from "mongoose";
const likeSchema=new Schema({
    video:{
        type:Schema.Types.objectId,
        ref:"Video"
    },
     comment:{
        type:Schema.Types.objectId,
        ref:"comment"
    },
     tweet:{
        type:Schema.Types.objectId,
        ref:"tweet"
    },
     likedBy:{
        type:Schema.Types.objectId,
        ref:"User"
    },
},{timestamps:true})
export const Like=mongoose.model("Like",likeSchema)