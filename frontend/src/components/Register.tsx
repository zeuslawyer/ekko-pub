

import React from 'react'
import { LoginForm } from './LoginForm'



export interface ApiResponse {
    message: string;
    code: number;
}


export const Register = () => {

    return (
        <>
            <LoginForm />
        </>

    )
}


