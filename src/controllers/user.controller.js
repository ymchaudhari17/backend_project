import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js"
import { jwt } from "jsonwebtoken"

const generateAccessAndRefreshTokens=async(userId)=>{
  try{
const user=await User.findById(userId)
const accessToken= user.generatedAccessToken()
const refreshToken=user.generateRefreshToken()
user.refreshToken=refreshToken
await user.save({validateBeforeSave:false})
return {accessToken,refreshToken}
  }catch(error){
    console.log("TOKEN ERROR:", error);
    throw error;
    // throw new ApiError(500,"Something went wrong while generating refresh and access token")
  }
}

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
//login
const loginUser=asyncHandler(async(req,res)=>{
  //req->data
  //username or email
  //find user
  //check pass
  //access and refresh token
  //send cookie
  const {email,username,password}=req.body
  if(!username  && !email){
    throw new ApiError(400,"username or email is required")
  }
 const user=await  User.findOne({
    $or:[{username},{email}]
  })
  if(!user){
    throw new ApiError(404,"User does not exist")
  }
  const isPasswordValid=await user.isPasswordCorrect(password)
  if(!isPasswordValid){
    throw new ApiError(401,"Invalid user crendentials")
  }
  const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)
const loggedInUser=await User.findById(user._id).select("-password -refreshToken")
 const options={
  httpOnly:true,
  secure:true
 }
  return res.status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(
    new ApiResponse(
      200,
      {
        user:loggedInUser,accessToken,refreshToken
      },
      "user logged in successfully"
    )
  )
})


//loggin out
const logoutUser=asyncHandler(async(req,res)=>{
  await User.findByIdAndUpdate(
   req.user._id,
   {
    $set:{
      refreshToken:undefined
    }
   },
   {
    new:true
   }
  );
  const options={
  httpOnly:true,
  secure:true
 }
 return res
 .status(200)
 .clearCookie("accessToken",options)
 .clearCookie("refreshToken",options)
 .json(new ApiResponse(200,{},"User logged Out"))

});


const refreshAccessToken=asynHandler(async(req,res)=>{
const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

if(!incomingRefreshToken){
  throw new ApiError(401,"unauthorized request ")
}
 
try {
  const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
  
  const user=await User.findById(decodedToken?._id)
  if(!user){
    throw new ApiError(401,"Invalid refresh token ")
  }
  if(incomingRefreshToken!== user?.refreshToken){
    throw new ApiError(401,"Refresh token is expired or used")
  }
  
  const options={
    httpOnly:true,
    secure:true
  }
  const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
  
  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",newRefreshToken,options)
  .json(
    new ApiResponse(
      200,
      {accessToken,refreshToken:newRefreshToken},
      "Access token refreshed"
    )
  )
} catch (error) {
  throw new ApiError(401,error?.message || "Invalid refresh token")
}
})


const changeCurrentPassword=asyncHandler(async(req,res)=>{
  const {oldPassword,newPassword}=req.body
 const user=await User.findById(req.user?.id)
 const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

 if(!isPasswordCorrect){
  throw new ApiError(400,"Invalid old password")
 }
 user.password=new password
await user.save({validateBeforeSave:false})
return res.status(200)
.json(new ApiResponse(200,{},"Password changed succesfully"))
})

const getCurrentUser=asyncHandler(async(req,res)=>{
  return res.status(200)
  .json(new ApiResponse(200,req.user,"current user fetched succesfully"))
})

const updateAccountDetails=asyncHandler(async(req,res)=>{

const {fullname,email}=req.body
if(!fullnamee || !error){
  throw new ApiError(400,"All fields are required")
}
User.findByIdAndUpdate(
  req.user._id,
  {
    $set:{
      fullname:fullname,
      email:email
    }
  },
  {new:true}
).select("-password")
return res.status(200)
.json(new ApiResponse(200,user,"Account details updated successfully"))
})


const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path
    if(!avatarLocalPath){
      throw new ApiError(400,"Avatar is missing")
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
       throw new ApiError(400,"Error while uploading on avatar")
    }
    const user=await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set:{
          avatar:avatar.url
        }
      },{
        new:true
      }
    ).select("-password")
return res.status(200)
    .json(new ApiResponse(200,user,"Avatar updated successfully"))
})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const CoverImageLocalPath=req.file?.path
    if(!avatarLocalPath){
      throw new ApiError(400,"Cover Image  is missing")
    }
    const avatar=await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
       throw new ApiError(400,"Error while uploading on cover image")
    }
    const user=await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set:{
          coverImage:coverImage.url
        }
      },{
        new:true
      }
    ).select("-password")
    return res.status(200)
    .json(new ApiResponse(200,user,"Cover Image updated successfully"))

})
export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage}
 //get user from frontend
   //validation
   //check if user is already registered- using email or username
  //check for images(cover image) and avatar 
  //upload them to cloudinary-check if avatar is uloaded or not
  //create user object-create its entry in db
  //remove password and refresh token from response
  //check if user is created succesfully
  //return response