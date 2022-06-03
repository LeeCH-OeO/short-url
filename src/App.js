import { Button, IconButton, TextField, Typography } from "@mui/material";
import { useState } from "react";
import {
  Header,
  MainContainer,
  InputContainer,
  ResultContainer,
  ResultURL,
  ButtonContainer,
  FooterContainer,
} from "./Style";
import { APIKEY } from "./api/api"; //set APIKEY
import Snackbar from "@mui/material/Snackbar";
import TwitterIcon from "@mui/icons-material/Twitter";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

function App() {
  const [OriginalUrl, setOriginalUrl] = useState("");
  const [ShortenURL, setShortenURL] = useState("");
  const [Shorten, setShorten] = useState(false);
  const [isSnackbar, setSnackbar] = useState(false);
  const handleClick = async () => {
    if (OriginalUrl === "") {
      alert("請輸入");
      return;
    }
    setShorten(false);
    FetchURL(OriginalUrl);
  };
  const FetchURL = async (Url) => {
    const options = {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        apikey: APIKEY,
      },
      body: JSON.stringify({
        destination: Url,
        domain: { fullName: "st.chihsuan-lee.dev" },
      }),
    };

    await fetch("https://api.rebrandly.com/v1/links", options)
      .then((response) => response.json())
      .then((response) => {
        if (response.shortUrl) {
          setShortenURL(response.shortUrl);
          setShorten(true);
          clearInput();
        } else {
          alert("Invalid format");
          clearInput();
        }
      });
  };
  const clearInput = () => {
    setOriginalUrl("");
  };
  const handleCopy = () => {
    navigator.clipboard.writeText("https://" + ShortenURL);
    setSnackbar(true);
  };
  const handleSnackbarClose = () => {
    setSnackbar(false);
  };
  return (
    <MainContainer>
      <div>
        <Header>
          <Typography variant="h2" sx={{ fontWeight: "bold" }}>
            Short url
          </Typography>
        </Header>
        <InputContainer>
          <TextField
            label="Original URL"
            variant="standard"
            fullWidth
            onChange={(e) => {
              setOriginalUrl(e.target.value);
            }}
          />
          <Button
            variant="contained"
            onClick={handleClick}
            disabled={OriginalUrl ? false : true}
          >
            shorten
          </Button>
        </InputContainer>
        {Shorten && ShortenURL && (
          <ResultContainer>
            <ResultURL>
              <Typography
                variant="subtitle2"
                sx={{ fontFamily: "Roboto Mono" }}
              >
                <a
                  href={`https://${ShortenURL}`}
                  style={{ textDecoration: "none", color: "black" }}
                >
                  {ShortenURL}
                </a>
              </Typography>
            </ResultURL>
            <ButtonContainer>
              <IconButton onClick={handleCopy}>
                <ContentCopyIcon />
              </IconButton>

              <IconButton>
                <a
                  style={{ textDecoration: "none", color: "gray" }}
                  href={`https://twitter.com/intent/tweet?text=https://${ShortenURL}`}
                >
                  <TwitterIcon />
                </a>
              </IconButton>
            </ButtonContainer>
          </ResultContainer>
        )}
        <Snackbar
          open={isSnackbar}
          autoHideDuration={5000}
          onClose={handleSnackbarClose}
          message="The shortened URL has been copied to your clipboard"
        />
        <FooterContainer>
          <Typography sx={{ fontFamily: "Roboto Mono" }}>
            <a
              href="https://github.com/LeeCH-OeO/short-url"
              style={{ textDecoration: "none" }}
            >
              © 2022 ChiHsuan-Lee
            </a>
          </Typography>
        </FooterContainer>
      </div>
    </MainContainer>
  );
}

export default App;
