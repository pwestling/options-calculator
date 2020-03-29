import { makeStyles, styled } from "@material-ui/core/styles";

export const useStyles = makeStyles({
  root: {
    minWidth: 500
  },
  credit: {
    color: "green"
  },
  debit: {
    color: "red"
  },
  bullet: {
    display: "inline-block",
    margin: "0 2px",
    transform: "scale(0.8)"
  },
  title: {
    fontSize: 14
  },
  pos: {
    marginBottom: 12
  },
  container: {
    paddingTop: "4em"
  },
  inline: {
    display: "flex",
    flexDirection: "row"
  },
  pageContainer: {
    margin: "3em"
  },
  smallCell: {
    padding: "3px"
  },
  headerCell: {
    padding: "3px",
    fontWeight: 800
  },
  marginBot4: {
    marginBottom: "2em"
  }
});