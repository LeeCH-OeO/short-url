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
  GlobalStyle,
  InnerContainer,
} from "./Style";
import Snackbar from "@mui/material/Snackbar";
import TwitterIcon from "./icons/twitter.svg";
import FBIcon from "./icons/facebook.svg";
import CopyIcon from "./icons/copy.svg";
import ShareIcon from "./icons/share.svg";
import TelegramIcon from "./icons/telegram.svg";
import axios from "axios";

function App() {
  const [OriginalUrl, setOriginalUrl] = useState("");
  const [ShortenURL, setShortenURL] = useState("");
  const [Shorten, setShorten] = useState(false);
  const [isSnackbar, setSnackbar] = useState(false);
  const domainUrl = "https://st.ch-lee.xyz/";
  const handleClick = async () => {
    if (OriginalUrl === "") {
      alert("請輸入");
      return;
    }
    setShorten(false);
    FetchURL(OriginalUrl);
  };
  const FetchURL = async (Url) => {
    try {
      const res = await axios({
        method: "post",
        url: "https://st.ch-lee.xyz/api/short",
        data: { url: Url },
        headers: { "Content-Type": "application/json" },
      });
      console.log(res.data.id);
      setShortenURL(domainUrl + res.data.id);
      setShorten(true);
      clearInput();
    } catch (error) {
      console.log(error);
    }
  };
  const clearInput = () => {
    setOriginalUrl("");
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(ShortenURL);
    setSnackbar(true);
    console.log("click");
  };
  const handleSnackbarClose = () => {
    setSnackbar(false);
  };

  const ShareButton = () => {
    if (navigator.canShare)
      return (
        <img
          src={ShareIcon}
          onClick={async () => {
            try {
              await navigator.share({
                url: ShortenURL,
              });
              console.log("Data was shared successfully");
            } catch (err) {
              console.error("Share failed:", err.message);
            }
          }}
          style={{
            width: "32px",
            height: "32px",
            cursor: "pointer",
          }}
        />
      );
    else return <></>;
  };

  return (
    <div>
      <GlobalStyle />

      <MainContainer>
        <InnerContainer>
          <Header>
            <p
              style={{
                textDecoration: "none",

                fontWeight: "bolder",
                fontSize: "2rem",
              }}
            >
              Short URL
            </p>
          </Header>
          <InputContainer>
            <TextField
              value={OriginalUrl}
              label="Original URL"
              variant="standard"
              fullWidth
              onChange={(e) => {
                setOriginalUrl(e.target.value);
              }}
            />
            <div style={{ display: "inline-block", paddingTop: "1rem" }}>
              <Button
                variant="contained"
                onClick={handleClick}
                size="large"
                disabled={OriginalUrl ? false : true}
              >
                shorten
              </Button>
            </div>
          </InputContainer>
          {Shorten && ShortenURL && (
            <ResultContainer>
              <ResultURL>
                <a
                  href={`${ShortenURL}`}
                  style={{
                    textDecoration: "none",
                    color: "rgb(25, 118, 210)",
                    fontWeight: "bold",
                    fontSize: "1.2rem",
                  }}
                >
                  {ShortenURL}
                </a>
              </ResultURL>
              <ButtonContainer>
                <img
                  onClick={handleCopy}
                  src={CopyIcon}
                  style={{
                    width: "32px",
                    height: "32px",
                    cursor: "pointer",
                  }}
                />
                <ShareButton />
                <a
                  style={{ textDecoration: "none", color: "gray" }}
                  href={`https://twitter.com/intent/tweet?text=${ShortenURL}`}
                >
                  <img
                    src={TwitterIcon}
                    style={{
                      width: "32px",
                      height: "32px",
                    }}
                  />
                </a>

                <a
                  style={{ textDecoration: "none", color: "gray" }}
                  href={`https://www.facebook.com/sharer/sharer.php?u=${ShortenURL}`}
                >
                  <img
                    src={FBIcon}
                    style={{
                      width: "32px",
                      height: "32px",
                    }}
                  />
                </a>
                <a href={`https://t.me/share/url?url=${ShortenURL}`}>
                  <img
                    src={TelegramIcon}
                    style={{
                      width: "32px",
                      height: "32px",
                    }}
                  />
                </a>
              </ButtonContainer>
            </ResultContainer>
          )}
          <Snackbar
            open={isSnackbar}
            autoHideDuration={5000}
            onClose={handleSnackbarClose}
            message="The shortened URL has been copied to your clipboard"
          />
        </InnerContainer>
        <FooterContainer>
          <a
            href="https://github.com/LeeCH-OeO/short-url"
            style={{ textDecoration: "none" }}
          >
            © 2022 Chi-Hsuan Lee
          </a>
        </FooterContainer>
      </MainContainer>
    </div>
  );
}

export default App;
