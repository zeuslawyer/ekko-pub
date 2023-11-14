import React from 'react'
import { Firebase } from '../firebase/Firebase'
import { withRouter, RouteComponentProps } from 'react-router-dom'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Toast from 'react-bootstrap/Toast'
import Container from 'react-bootstrap/Container'
import homerun from './images/homerun.svg'


interface Props extends RouteComponentProps {

}
export const _LoginForm: React.FC<Props> = (props: Props) => {
    const isRegisterRoute = window.location.href.includes("/register")

    const [tz] = React.useState<string>(() => Intl.DateTimeFormat().resolvedOptions().timeZone)
    const [email] = React.useState<string>(() => props.location.search.split("=")[1])

    const [pwd, setPwd] = React.useState<string>("")
    const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false)
    const [done, setDone] = React.useState<boolean>(false)
    const [error, setError] = React.useState<{ message: string; code: number }>()


    // const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    //     if (event.target.type === "password") setPwd(event.target.value)
    // }


    const renderError = () => {
        if (error && error.message) {
            return (
                <Row>
                    <Col xs={6}>
                        <Toast show={error.code !== 200} onClose={() => setError(undefined)} style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                        }}>
                            <Toast.Header>
                                <img
                                    src="holder.js/20x20?text=%20"
                                    className="rounded mr-2"
                                    alt=""
                                />
                                <strong className="mr-auto">Computer says no...</strong>
                            </Toast.Header>
                            <Toast.Body>Sorry. {error.message}. <a href="mailto:hello@getremynd.com" target="_blank" rel="noopener noreferrer"> Report this.</a></Toast.Body>
                        </Toast>
                    </Col>
                </Row>
            )
        }
    }

    const renderForm = () => {
        return (
            < form onSubmit={submitForm} >
                <h3> Quick sign up just so we can link your timezone to you</h3>

                {/* show the timezone field only on the registration route and if timezone not null. 
         // TODO:  add drop down in case tz is null
         */}
                {
                    isRegisterRoute && tz ? (
                        <div className="form-group">
                            <label style={{ fontWeight: "bold" }} >Your timezone</label>
                            <input readOnly type="text" className="form-control-plaintext" value={tz} />
                        </div>
                    ) : null
                }

                <div className="form-group">
                    <label style={{ fontWeight: "bold" }}>Your Email address</label>
                    <input type="email" value={email} className="form-control-plaintext" placeholder="Enter email" onChange={() => { }} />
                </div>

                {/* <div className="form-group">
            <label style={{ fontWeight: "bold" }}>Password</label>
            <input type="password" value={pwd} className="form-control" placeholder="Enter password" onChange={handleInput} />
        </div> */}

                <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-block">Submit  </button>
            </form >
        )
    }

    const renderOk = () => {
        return (
            <Container>
                <div style={{ textAlign: "center" }}>
                    <h3 > Great, all done!</h3>
                    <div>You can close the browser now <span role="img" aria-label="thumbs up">👍</span></div>
                </div>

                <div style={{ marginTop: "55px", "width": "75%" }}>
                    <img src={homerun} alt="All done" />
                </div>
            </Container>
        )

    }

    const renderPage = () => {
        return (
            <>
                {renderError()}

                {!done ? renderForm() : renderOk()}

            </>
        );
    }

    const submitForm = async (event: any) => {
        event.preventDefault()

        // send email and tz to db
        setIsSubmitting(true)
        const apiRes = await Firebase.registerWithTz({
            tz, email, pwd
        })
        setIsSubmitting(false)
        if (apiRes.data.code !== 200) {
            setError(apiRes.data)
        } else {
            setDone(true)
        }

        setPwd("")
    }

    return renderPage()

}

export const LoginForm = withRouter(_LoginForm)
