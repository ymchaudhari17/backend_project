import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js"



const registerUser=asyncHandler(async(req,res)=>{
const {email,password,username,fullname}=req.body
console.log("email:",email);
// if(fullname===""){
// throw new ApiError(400,"fullname is required")
// } can also check individually like this or use some method to check everything at once
if([fullname,email,username,password].some((field)=>field?.trim()==="")){
  throw new ApiError(400,"All fields are required")
}
const existedUser=await User.findOne({
  $or:[{username},{email}]
})
if(existedUser){
  throw new ApiError(409,"User with this email or username already exists")
}
const avatarLocalPath=req.files?.avatar[0]?.path;
// const coverImageLocalPath=req.files?.coverImage[0]?.path;
let coverImageLocalPath;
if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
coverImageLocalPath=req.files.coverImage[0].path
}

if(!avatarLocalPath){
  throw new ApiError(400,"Avatar file is required")
}
 const avatar=await uploadOnCloudinary(avatarLocalPath)
 const coverImage=await uploadOnCloudinary(coverImageLocalPath)
 if(!avatar){
  throw new ApiError(400,"Avatar file is required")
 }
const user=await User.create({
  fullname,
  avatar:avatar.url,
  coverImage:coverImage?.url || "",
  email,
  password,
  username:username.toLowerCase()
})

const createdUser=await User.findById(user._id).select(
  "-password -refreshToken"
)
if(!createdUser){
  throw new ApiError(500,"Something went wrong while registering the user ")
}
return res.status(201).json(
  new ApiResponse(200,createdUser,"User registered succesfully")
)
})
export {registerUser}
 //get user from frontend
   //validation
   //check if user is already registered- using email or username
  //check for images(cover image) and avatar 
  //upload them to cloudinary-check if avatar is uloaded or not
  //create user object-create its entry in db
  //remove password and refresh token from response
  //check if user is created succesfully
  //return response