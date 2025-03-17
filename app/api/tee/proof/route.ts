import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Get the session on the server
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse the request from the client
    const { teeUrl, requestBody } = await req.json();
    
    // Add the Google token to the request body
    const modifiedRequestBody = {
      ...requestBody,
      env_vars: {
        ...requestBody.env_vars,
        GOOGLE_TOKEN: session.accessToken,
      },
    };

    // Forward the request to the TEE
    const contributionProofResponse = await fetch(`${teeUrl}/RunProof`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(modifiedRequestBody),
    });

    // Return the TEE response to the client
    const data = await contributionProofResponse.json();
    
    if (!contributionProofResponse.ok) {
      return NextResponse.json(
        { error: 'TEE request failed', details: data },
        { status: contributionProofResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in TEE proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 