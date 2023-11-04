import styled, { createGlobalStyle } from "styled-components";

export const MainContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  flex-direction: column;
`;
export const InnerContainer = styled.div`
  background-color: #f7f2f9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 1rem;
  border-radius: 20px;
  height: 60%;
  width: 60vw;
  @media (max-width: 600px) {
    width: 70vw;
  }
`;
export const Header = styled.div`
  width: 50vw;
  display: flex;
  justify-content: center;
`;
export const InputContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 50vw;
  flex-direction: column;
`;

export const ResultContainer = styled.div`
  margin-top: 1vh;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: column;
  width: 50vw;
`;
export const ResultURL = styled.div`
  padding: 0.2rem;
`;
export const ButtonContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;
export const FooterContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0.5;
  text-decoration: none;
`;
export const LineImgContainer = styled.a`
  border-radius: 50%;
  padding: 8px;
`;
export const GlobalStyle = createGlobalStyle`
  body, html {
    background-color: #fffbfe;
    font-family: 'Noto Sans', sans-serif;
  }
`;
