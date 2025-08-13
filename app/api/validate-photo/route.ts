import type { NextRequest } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(req: NextRequest) {
  try {
    console.log("=== Gemini AI Validation API called ===")

    const form = await req.formData()
    const file = form.get("file") as File | null
    const target = (form.get("target") as string | null) ?? ""

    console.log("Request details:", {
      hasFile: !!file,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      target,
    })

    if (!file || !target) {
      return new Response(
        JSON.stringify({
          error: "Missing file or target",
          valid: false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({
          error: `Unsupported image type: ${file.type}`,
          valid: false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({
          error: `File too large: ${Math.round(file.size / 1024 / 1024)}MB (max 5MB)`,
          valid: false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      console.error("Missing GOOGLE_GENERATIVE_AI_API_KEY")
      return new Response(
        JSON.stringify({
          error: "AI service not configured",
          valid: false,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          required: ["Result"],
          properties: {
            Result: {
              type: "boolean",
            },
          },
        },
      },
    })

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    const imagePart = {
      inlineData: {
        data: base64,
        mimeType: file.type,
      },
    }

    const prompt = `Look at this image and determine if it contains a "${target}". 
    Return a JSON response with a "Result" field that is true if the image contains the target object, false otherwise.
    Be accurate and only return true if you can clearly see the specified object in the image.`

    console.log("Sending to Gemini AI:", { target, fileType: file.type })

    const result = await model.generateContent([prompt, imagePart])
    const response = await result.response
    const text = response.text()

    console.log("Gemini AI response:", text)

    let geminiResult
    try {
      geminiResult = JSON.parse(text)
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError)
      return new Response(
        JSON.stringify({
          error: "Invalid AI response format",
          valid: false,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const isValid = geminiResult.Result === true

    console.log("Validation result:", { target, valid: isValid })

    return new Response(
      JSON.stringify({
        valid: isValid,
        confidence: "high",
        target,
        timestamp: new Date().toISOString(),
        message: isValid ? `Found ${target} in image` : `${target} not found in image`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("=== Gemini Validation Error ===")
    console.error("Error:", error)

    return new Response(
      JSON.stringify({
        error: "AI validation service error",
        valid: false,
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
