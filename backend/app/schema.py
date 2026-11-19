from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Topic = Literal["quality", "delivery", "price", "packaging", "support", "size_fit", "other"]
Line = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=400, pattern=r"^[^\r\n]+$")]


class Analysis(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    sentiment: Literal["positive", "neutral", "negative"]
    topics: list[Topic] = Field(min_length=1, max_length=7)
    summary: Line
    needs_reply: bool


class Reply(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    reply: Line
