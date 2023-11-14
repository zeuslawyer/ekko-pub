import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Container from 'react-bootstrap/Container'

import * as ROUTES from '../constants/Routes'
import { Home } from './Home';
import { Register } from './Register';


function App() {
  return (
    <Container>
      <Router>
        <Switch >
          <Route exact path={ROUTES.REGISTER} component={Register} />

          {/* keep the home route last so it acts as catchall */}
          <Route path={ROUTES.HOME} component={Home} />
        </Switch>
      </Router>
    </Container>
  );
}

export default App;
