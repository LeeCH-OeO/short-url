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
  LineImgContainer,
} from "./Style";
import Snackbar from "@mui/material/Snackbar";
import TwitterIcon from "@mui/icons-material/Twitter";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LineImage from "./LineIcon.png";
import axios from "axios";
import { MdFacebook } from "react-icons/md";

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
  };
  const handleSnackbarClose = () => {
    setSnackbar(false);
  };
  return (
    <MainContainer>
      <div>
        <Header>
          <Typography variant="h2" sx={{ fontWeight: "bold" }}>
            Short URL
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
                  href={`${ShortenURL}`}
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
                  href={`https://twitter.com/intent/tweet?text=${ShortenURL}`}
                >
                  <TwitterIcon />
                </a>
              </IconButton>
              <LineImgContainer
                href={`https://social-plugins.line.me/lineit/share?url=${ShortenURL}`}
              >
                <img
                  src={LineImage}
                  width="25"
                  height="25"
                  alt="share to Line"
                />
              </LineImgContainer>
              <IconButton>
                <a
                  style={{ textDecoration: "none", color: "gray" }}
                  href={`https://www.facebook.com/sharer/sharer.php?u=${ShortenURL}`}
                >
                  <MdFacebook size="2rem" />
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
              © 2022 Chi-Hsuan Lee
            </a>
          </Typography>
        </FooterContainer>
      </div>
    </MainContainer>
  );
}

export default App;
