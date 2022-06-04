import styled from "styled-components";

export const MainContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80vh;
`;
export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;
export const InputContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 90vw;
`;
export const ResultContainer = styled.div`
  margin-top: 1vh;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 90vw;
`;
export const ResultURL = styled.div`
  border: 1px solid;
  border-color: #696969;
  background-color: gray;
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
  margin-top: 2rem;
`;
export const LineImgContainer = styled.a`
  border-radius: 50%;
  padding: 8px;

  &:hover {
    background-color: #f5f5f5;
    cursor: pointer;
  }
`;
